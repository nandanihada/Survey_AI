import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import SurveyForm from './components/SurveyForm.tsx';
// import SurveyViewer from './components/SurveyViewer.tsx'; // 👈 Create this file if not yet
import PublicSurveyPage from './components/PublicSurveyPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/generate" element={<SurveyForm />} />
       <Route path="/survey/:id" element={<PublicSurveyPage />} /> {/* 👈 Dynamic public route */}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
