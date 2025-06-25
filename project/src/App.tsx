import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs';
import SurveyForm from './components/SurveyForm';
import SurveyList from './components/SurveyList';
import ResponseAnalytics from './components/ResponseAnalytics';
import PostbackGenerator from './components/PostbackGenerator';
import { PenSquare, FolderOpen, TrendingUp, Link } from 'lucide-react';


function App() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-red-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
  <>
  <img
    src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
    alt="Chilli Icon"
    className="w-14 h-14 inline-block"
    style={{ animation: 'wiggleGlow 1s infinite', filter: 'drop-shadow(0 0 6px red)' }}
  />
  <style>{`@keyframes wiggleGlow {
    0%,100%{transform:rotate(0deg);filter:drop-shadow(0 0 6px red)}
    25%{transform:rotate(5deg);filter:drop-shadow(0 0 10px red)}
    75%{transform:rotate(-5deg);filter:drop-shadow(0 0 10px red)}
  }`}</style>
</>

  AI Survey Generator
</h1>
            <p className="text-gray-600 text-lg">
              Create intelligent surveys with AI-powered customization
            </p>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-100 rounded-2xl p-1">
              <TabsTrigger 
                value="create" 
                className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <PenSquare size={18} />
                Create Survey
              </TabsTrigger>
              <TabsTrigger 
                value="surveys" 
                className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <FolderOpen size={18} />
                Surveys
              </TabsTrigger>
              <TabsTrigger 
                value="responses" 
                className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <TrendingUp size={18} />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="postback" 
                className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <Link size={18} />
                Postback
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-0">
              <SurveyForm />
            </TabsContent>

            <TabsContent value="surveys" className="mt-0">
              <SurveyList />
            </TabsContent>

            <TabsContent value="responses" className="mt-0">
              <ResponseAnalytics />
            </TabsContent>

            <TabsContent value="postback" className="mt-0">
              <PostbackGenerator />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default App;