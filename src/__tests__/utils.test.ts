import { formatExpiryDate, isPollExpired } from "@/lib/utils";

describe("poll utility helpers", () => {
  it("determines expired polls correctly", () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const futureDate = new Date(Date.now() + 1000 * 60).toISOString();

    expect(isPollExpired(pastDate)).toBe(true);
    expect(isPollExpired(futureDate)).toBe(false);
    expect(isPollExpired(null)).toBe(false);
  });

  it("formats expiry dates with fallback", () => {
    const formatted = formatExpiryDate(null);
    expect(formatted).toBe("기한 없음");
  });
});
