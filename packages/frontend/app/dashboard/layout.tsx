// Dashboard layout (D-084): only adds a pre-paint script that restores the desktop sidebar's collapsed
// state from this browser's localStorage, so a collapsed sidebar does not flash open on every page load.
// The CSS keys off <html data-adm-side="collapsed">; AdminNav keeps the attribute and the stored value in sync.
const RESTORE_SIDEBAR = "try{if(localStorage.getItem('admSide')==='collapsed')document.documentElement.setAttribute('data-adm-side','collapsed')}catch(e){}";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: RESTORE_SIDEBAR }} />
      {children}
    </>
  );
}
