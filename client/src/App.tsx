import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Anomalies } from './pages/Anomalies';
import { Resources } from './pages/Resources';
import { Events } from './pages/Events';
import './index.css';

console.log("App.tsx module loaded");

function App() {
  console.log("App component rendering");
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="resources" element={<Resources />} />
          <Route path="events" element={<Events />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
