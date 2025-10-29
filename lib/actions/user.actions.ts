"use server";

import { revalidatePath } from "next/cache";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";

import { plaidClient } from '@/lib/plaid';
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { supabaseAdmin, supabasePublic, setAuthCookies, clearAuthCookies, getAuthUserIdFromCookies, refreshAuthSession } from "../supabase";

const USERS_TABLE = "users";
const BANKS_TABLE = "banks";
const TRANSACTIONS_TABLE = "transactions"; // kept for reference across app

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    console.log('[getUserInfo] Fetching user profile for auth_user_id:', userId);
    const { data, error } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("*")
      .eq("auth_user_id", userId)
      .single();

    if (error) {
      console.error('[getUserInfo] Database error:', error);
      return null;
    }

    if (!data) {
      console.log('[getUserInfo] No user profile found in database');
      return null;
    }

    console.log('[getUserInfo] User profile found:', data.email);

    const user = {
      $id: data.id,
      email: data.email,
      userId: data.auth_user_id,
      dwollaCustomerUrl: data.dwolla_customer_url,
      dwollaCustomerId: data.dwolla_customer_id,
      firstName: data.first_name,
      lastName: data.last_name,
      name: `${data.first_name} ${data.last_name}`,
      address1: data.address1,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      dateOfBirth: data.date_of_birth,
      ssn: data.ssn,
    } as unknown as User;

    return parseStringify(user);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export const signIn = async ({ email, password }: signInProps) => {
  try {
    console.log('[signIn] Starting sign-in for:', email);
    const { data: auth, error } = await supabasePublic.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[signIn] Auth error:', error);
      throw error;
    }

    if (!auth.session || !auth.user) {
      console.error('[signIn] No session or user in auth response');
      throw new Error('Invalid credentials');
    }

    console.log('[signIn] Auth successful, user ID:', auth.user.id);
    await setAuthCookies(auth.session.access_token, auth.session.refresh_token, auth.user.id);
    console.log('[signIn] Cookies set');

    const user = await getUserInfo({ userId: auth.user.id });
    console.log('[signIn] User info retrieved:', user ? 'yes' : 'no');

    if (!user) {
      console.error('User profile not found after authentication');
      throw new Error('User profile not found. Please contact support.');
    }

    console.log('[signIn] Returning user:', user.email);
    return parseStringify(user);
  } catch (error) {
    console.error('[signIn] Sign in error:', error);
    return null;
  }
}

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  try {
    // Create auth user using admin client with confirmed email
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
      },
    });

    if (authErr || !authData.user) {
      console.error('Auth error:', authErr?.message || authErr);
      throw authErr || new Error('Error creating auth user');
    }

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal',
    });
    if (!dwollaCustomerUrl) throw new Error('Error creating Dwolla customer');
    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    // Create profile row
    const { data: newUserRow, error: insertErr } = await supabaseAdmin
      .from(USERS_TABLE)
      .insert({
        auth_user_id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        address1: userData.address1,
        city: userData.city,
        state: userData.state,
        postal_code: userData.postalCode,
        date_of_birth: userData.dateOfBirth,
        ssn: userData.ssn,
        dwolla_customer_id: dwollaCustomerId,
        dwolla_customer_url: dwollaCustomerUrl,
      })
      .select("*")
      .single();

    if (insertErr || !newUserRow) {
      console.error('Profile insert error:', insertErr?.message || insertErr);
      throw insertErr || new Error('Error creating user profile');
    }

    // Sign in to get session tokens
    const { data: auth, error: signInErr } = await supabasePublic.auth.signInWithPassword({ email, password });
    if (signInErr || !auth.session || !auth.user) throw signInErr || new Error('Auth sign-in failed');

    await setAuthCookies(auth.session.access_token, auth.session.refresh_token, auth.user.id);

    const user: User = {
      $id: newUserRow.id,
      email: newUserRow.email,
      userId: authData.user.id,
      dwollaCustomerUrl,
      dwollaCustomerId,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      address1: newUserRow.address1,
      city: newUserRow.city,
      state: newUserRow.state,
      postalCode: newUserRow.postal_code,
      dateOfBirth: newUserRow.date_of_birth,
      ssn: newUserRow.ssn,
    } as unknown as User;

    return parseStringify(user);
  } catch (error) {
    console.error('Error', error);
    return null;
  }
}

export async function getLoggedInUser() {
  try {
    console.log('[getLoggedInUser] Checking for auth cookies');
    const authUserId = await getAuthUserIdFromCookies();
    console.log('[getLoggedInUser] Auth user ID from cookies:', authUserId ? 'found' : 'not found');

    if (!authUserId) {
      console.log('[getLoggedInUser] No auth user ID, returning null');
      return null;
    }

    try {
      const user = await getUserInfo({ userId: authUserId });
      console.log('[getLoggedInUser] User info retrieved:', user ? user.email : 'null');
      return parseStringify(user);
    } catch (error) {
      console.error('[getLoggedInUser] Error getting user info:', error);

      // Attempt to refresh session if token might be expired
      console.log('[getLoggedInUser] Attempting to refresh session');
      const refreshed = await refreshAuthSession();

      if (refreshed) {
        console.log('[getLoggedInUser] Session refreshed, retrying getUserInfo');
        const user = await getUserInfo({ userId: authUserId });
        console.log('[getLoggedInUser] User info retrieved after refresh:', user ? user.email : 'null');
        return parseStringify(user);
      }

      return null;
    }
  } catch (error) {
    console.error('[getLoggedInUser] Error:', error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    await clearAuthCookies();
    return true;
  } catch (error) {
    return null;
  }
}

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id,
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    }

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({ linkToken: response.data.link_token })
  } catch (error) {
    console.log(error);
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(BANKS_TABLE)
      .insert({
        user_id: userId,
        bank_id: bankId,
        account_id: accountId,
        access_token: accessToken,
        funding_source_url: fundingSourceUrl,
        shareable_id: shareableId,
      })
      .select("*")
      .single();

    if (error || !data) throw error || new Error('Failed to create bank account');

    const mapped = {
      $id: data.id,
      accountId: data.account_id,
      bankId: data.bank_id,
      accessToken: data.access_token,
      fundingSourceUrl: data.funding_source_url,
      userId: { $id: data.user_id },
      shareableId: data.shareable_id,
    } as unknown as Bank;

    return parseStringify(mapped);
  } catch (error) {
    console.log(error);
  }
}

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    if (!fundingSourceUrl) throw Error;

    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    revalidatePath("/");

    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("An error occurred while creating exchanging token:", error);
  }
}

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(BANKS_TABLE)
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const mapped = (data || []).map((row: any) => ({
      $id: row.id,
      accountId: row.account_id,
      bankId: row.bank_id,
      accessToken: row.access_token,
      fundingSourceUrl: row.funding_source_url,
      userId: row.user_id,
      shareableId: row.shareable_id,
    })) as unknown as Bank[];

    return parseStringify(mapped);
  } catch (error) {
    console.log(error)
  }
}

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(BANKS_TABLE)
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !data) throw error || new Error('Bank not found');

    const mapped = {
      $id: data.id,
      accountId: data.account_id,
      bankId: data.bank_id,
      accessToken: data.access_token,
      fundingSourceUrl: data.funding_source_url,
      userId: { $id: data.user_id },
      shareableId: data.shareable_id,
    } as unknown as Bank;

    return parseStringify(mapped);
  } catch (error) {
    console.log(error)
  }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(BANKS_TABLE)
      .select("*")
      .eq("account_id", accountId)
      .single();

    if (error || !data) return null;

    const mapped = {
      $id: data.id,
      accountId: data.account_id,
      bankId: data.bank_id,
      accessToken: data.access_token,
      fundingSourceUrl: data.funding_source_url,
      userId: { $id: data.user_id },
      shareableId: data.shareable_id,
    } as unknown as Bank;

    return parseStringify(mapped);
  } catch (error) {
    console.log(error)
  }
}
