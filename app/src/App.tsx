import { Route, Routes } from 'react-router-dom'
import Home from './routes/Home.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
