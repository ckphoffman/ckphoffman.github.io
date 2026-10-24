import { Routes, Route } from 'react-router-dom'
import TopBar from './components/TopBar'
import Videos from './pages/Videos'
import Words from './pages/Words'
import WordDetail from './pages/WordDetail'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <TopBar />
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Videos />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/words" element={<Words />} />
          <Route path="/words/:wordId" element={<WordDetail />} />
        </Routes>
      </div>
    </div>
  )
}

export default App