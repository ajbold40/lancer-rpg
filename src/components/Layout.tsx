import { NavLink, Outlet } from 'react-router-dom'

export const APP_NAME = 'Lancer Table'

export default function Layout() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">{APP_NAME}</NavLink>
        <nav>
          <NavLink to="/frames">Frames</NavLink>
          <NavLink to="/questionnaire">Find your frame</NavLink>
          <NavLink to="/table">Table</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          {APP_NAME} is not an official Lancer product; it is a third party work, and is
          not affiliated with Massif Press. {APP_NAME} is published via the Lancer Third
          Party License.
        </p>
        <p>Lancer is copyright Massif Press.</p>
      </footer>
    </div>
  )
}
