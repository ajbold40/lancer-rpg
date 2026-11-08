import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Frames from './pages/Frames'
import Questionnaire from './pages/Questionnaire'
import Table from './pages/Table'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="frames" element={<Frames />} />
          <Route path="questionnaire" element={<Questionnaire />} />
          <Route path="table" element={<Table />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
