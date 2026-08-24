import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLocale, isLocale, locales } from "@/lib/i18n";
import { getSiteSettings } from "@/lib/cms";

/** Run serverless close to Supabase (ap-northeast-1 / Tokyo). */
export const maxDuration = 30;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const settings = await getSiteSettings();
  const address = locale === "ru" ? settings.addressRu : settings.addressEn;

  return (
    <div className="flex min-h-full flex-col" lang={locale}>
      <Header locale={locale} phone={settings.phone} email={settings.email} />
      <main className="flex-1">{children}</main>
      <Footer
        locale={locale}
        phone={settings.phone}
        email={settings.email}
        address={address}
      />
    </div>
  );
}
