import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox'
import PlaidLink from '@/components/PlaidLink';
import LinkedAccountsList from '@/components/LinkedAccountsList';
import BankAccountManager from '@/components/BankAccountManager';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import React from 'react'

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();

  if(!loggedIn) {
    redirect('/sign-in');
  }

  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  return (
    <section className='flex'>
      <div className="my-banks">
        <HeaderBox
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activites."
        />

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="header-2">
                Your US Bank Cards
              </h2>
              <PlaidLink user={loggedIn} variant="primary" />
            </div>
            {accounts && accounts.data.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-6">
                  {accounts.data.map((a: Account) => (
                    <BankCard
                      key={accounts.id}
                      account={a}
                      userName={loggedIn?.firstName}
                    />
                  ))}
                </div>
                <div className="border-t pt-6">
                  <h3 className="text-16 font-semibold text-gray-900 mb-4">Account Management</h3>
                  <BankAccountManager accounts={accounts.data} userId={loggedIn.$id} />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <p className="text-14 text-gray-600 mb-4">No US bank accounts linked yet</p>
                <PlaidLink user={loggedIn} variant="primary" />
              </div>
            )}
          </div>

          <div className="border-t pt-8">
            <LinkedAccountsList userId={loggedIn.$id} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default MyBanks
