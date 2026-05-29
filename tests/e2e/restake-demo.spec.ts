import { expect, test } from "@playwright/test";

const txHashPattern = /0x[a-f0-9]{64}/i;
const walletPattern = /^Connected wallet 0x/i;

test.describe("Restake One desktop user flow", () => {
  test.skip(({ isMobile }) => isMobile, "desktop deposit flow runs once on the desktop project");

  test("lets a user pick an earn product, preview a deposit, confirm, and see portfolio update", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Restake into the AVS yield matrix." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Restaked ETH" })).toBeVisible();
    await expect(page.getByText("TVL")).toBeVisible();

    const connectButton = page.getByRole("button", { name: "Connect Wallet" }).first();
    if (await connectButton.isVisible().catch(() => false)) {
      await connectButton.click();
    }
    await expect(page.getByLabel(walletPattern)).toBeVisible();

    await page.getByRole("button", { name: /AVS Boost/ }).click();
    await expect(page.getByRole("heading", { name: "AVS Boost" })).toBeVisible();

    await page.getByLabel("Deposit asset").selectOption("eth");
    await page.getByLabel("You deposit", { exact: true }).fill("0.75");

    await page.getByRole("button", { name: "Preview deposit" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ready to deposit" })).toBeVisible();
    await expect(page.getByText("Monthly rewards")).toBeVisible();

    await page.getByRole("button", { name: "Confirm deposit" }).click();

    const success = page.getByRole("status").filter({ hasText: "Deposit confirmed" });
    await expect(success).toBeVisible();
    await expect(success).toContainText(txHashPattern);
    await expect(page.getByRole("button", { name: "Confirmed" })).toBeDisabled();

    const portfolio = page.getByRole("heading", { name: "Your restaked assets" }).locator("..").locator("..");
    await expect(portfolio).toContainText("boostETH");
    await expect(portfolio).toContainText("Backed by ETH through Kairos Validators");
  });
});

test.describe("Restake One mobile smoke", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile smoke runs only on the mobile project");

  test("keeps the commercial deposit flow usable on a phone viewport", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Restake into the AVS yield matrix." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Stake", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Connect Wallet|Preview deposit/ }).first()).toBeVisible();

    await page.getByRole("heading", { name: "Restaked ETH" }).scrollIntoViewIfNeeded();
    await expect(page.getByLabel("You deposit", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Deposit asset")).toBeVisible();

    await expect(page.getByRole("button", { name: /Restaked ETH/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /AVS Boost/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Points Max/ })).toBeVisible();
  });
});
