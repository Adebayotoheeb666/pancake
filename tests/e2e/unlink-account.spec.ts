import { test, expect } from '@playwright/test';

test('User can unlink bank account from My Banks UI', async ({ page }) => {
  // Intercept disconnect API
  await page.route('**/api/bank/disconnect', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  // Accept confirm dialogs
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  await page.goto('/my-banks');
  await expect(page).toHaveURL(/my-banks/);

  // Wait for disconnect button to appear (may be inside expanded card)
  const disconnectButton = await page.waitForSelector('button:has-text("Disconnect Account")', { timeout: 5000 });
  await disconnectButton.click();

  // Expect success toast to appear
  await page.waitForSelector('text=Disconnected', { timeout: 5000 });

  expect(true).toBe(true);
});
