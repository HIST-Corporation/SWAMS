import '@fontsource/mukta/400.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';
import '@swams/design-tokens/css/tokens.css';
import './globals.css';
import { Footer } from '../components/Footer.jsx';
import { Header } from '../components/Header.jsx';

export const metadata = {
  title: 'SWAMS — smart workflow and attendance for Nepal',
  description:
    'Attendance, tasks, leave and messaging for Nepal SMEs. BS/AD dates, NPR, English and Nepali.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

// Pre-paint theme-color hexes mirror packages/design-tokens/tokens.json color.bg
// { light, dark } — the only colour source (ADR 0004); ThemeProvider.applyTheme
// writes the same values, so nothing shifts after hydration.
const prePaintTheme = `(function(){try{var s=localStorage.getItem('swams.theme')||'system';var d=s==='dark'||(s==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var t=d?'dark':'light';var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#0D0F14':'#F6F7FB');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Pre-paint theme script (Section 8.3) — the only inline script (CSP).
            Rendered as a plain React <script> inside <head>: next/script with
            strategy="beforeInteractive" is hoisted into <head> by the server
            while its client render expects the tag at its JSX position in
            <body>, so hydration never matches and React re-creates the script
            client-side — which trips React's "script tag while rendering"
            warning (and the re-created script never executes). A plain script
            rendered here matches the server HTML, hydrates cleanly, and runs
            at parse time — before first paint. */}
        <script id="swams-theme" dangerouslySetInnerHTML={{ __html: prePaintTheme }} />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#F6F7FB" />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
