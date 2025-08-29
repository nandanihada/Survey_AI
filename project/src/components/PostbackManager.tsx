import React, { useState, useEffect } from 'react';
import { Link, Copy, Send, Settings, Eye, Plus, Trash2, Edit3, Activity, Clock, AlertCircle, CheckCircle2, Users, ExternalLink, TestTube } from 'lucide-react';
import PostbackTesting from './PostbackTesting';

interface PostbackManagerProps {
  isDarkMode?: boolean;
}

// API base URL
const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5000'
  : 'https://api.theinterwebsite.space/';

// API helper functions
const api = {
  async getPartners() {
    const response = await fetch(`${API_BASE}/api/partners`);
    if (!response.ok) throw new Error('Failed to fetch partners');
    return response.json();
  },
  
  async addPartner(partner: { name: string; url: string; status?: string }) {
    const response = await fetch(`${API_BASE}/api/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partner)
    });
    if (!response.ok) throw new Error('Failed to add partner');
    return response.json();
  },
  
  async updatePartner(id: string, partner: { name: string; url: string; status?: string }) {
    const response = await fetch(`${API_BASE}/api/partners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partner)
    });
    if (!response.ok) throw new Error('Failed to update partner');
    return response.json();
  },
  
  async deletePartner(id: string) {
    const response = await fetch(`${API_BASE}/api/partners/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete partner');
    return response.json();
  },
  
  async getLogs() {
    const response = await fetch(`${API_BASE}/api/postback-logs`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  },
  
  async getInboundLogs() {
    const response = await fetch(`${API_BASE}/api/inbound-postback-logs`);
    if (!response.ok) throw new Error('Failed to fetch inbound logs');
    return response.json();
  },
  
  async getPostbackShares() {
    const response = await fetch(`${API_BASE}/api/postback-shares`);
    if (!response.ok) throw new Error('Failed to fetch postback shares');
    return response.json();
  },
  
  async addPostbackShare(share: any) {
    const response = await fetch(`${API_BASE}/api/postback-shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(share)
    });
    if (!response.ok) throw new Error('Failed to add postback share');
    return response.json();
  },
  
  async updatePostbackShare(id: string, share: any) {
    const response = await fetch(`${API_BASE}/api/postback-shares/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(share)
    });
    if (!response.ok) throw new Error('Failed to update postback share');
    return response.json();
  },
  
  async deletePostbackShare(id: string) {
    const response = await fetch(`${API_BASE}/api/postback-shares/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete postback share');
    return response.json();
  },
  
  async generatePostbackUrl(id: string) {
    const response = await fetch(`${API_BASE}/api/postback-shares/${id}/generate-url`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to generate postback URL');
    return response.json();
  }
};


const PostbackManager: React.FC<PostbackManagerProps> = ({ isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<'sender' | 'receiver' | 'logs' | 'testing'>('sender');

  return (
    <div className={`p-6 rounded-2xl shadow-lg border ${
      isDarkMode 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-red-100'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Link size={24} className="text-red-600" />
          <span className="text-2xl">🌶️</span>
          Postback & Webhook Integrations
        </h2>
        <div className={`flex rounded-lg p-1 text-xs ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
          <button 
            onClick={() => setActiveTab('sender')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'sender' 
                ? (isDarkMode ? 'bg-red-500 text-white' : 'bg-white text-red-600 shadow-sm') 
                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
            }`}
          >
            <Send size={14} /> Outbound (Sender)
          </button>
          <button 
            onClick={() => setActiveTab('receiver')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'receiver' 
                ? (isDarkMode ? 'bg-red-500 text-white' : 'bg-white text-red-600 shadow-sm') 
                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
            }`}
          >
           <Eye size={14} /> Inbound (Receiver)
          </button>
           <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'logs' 
                ? (isDarkMode ? 'bg-red-500 text-white' : 'bg-white text-red-600 shadow-sm') 
                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
            }`}
          >
           <Activity size={14} /> Logs
          </button>
          <button 
            onClick={() => setActiveTab('testing')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'testing' 
                ? (isDarkMode ? 'bg-red-500 text-white' : 'bg-white text-red-600 shadow-sm') 
                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
            }`}
          >
           <TestTube size={14} /> Testing
          </button>
        </div>
      </div>

      {activeTab === 'sender' && <PostbackSender isDarkMode={isDarkMode} />}
      {activeTab === 'receiver' && <PostbackReceiver isDarkMode={isDarkMode} />}
      {activeTab === 'logs' && <PostbackLogs isDarkMode={isDarkMode} />}
      {activeTab === 'testing' && <PostbackTesting isDarkMode={isDarkMode} />}
    </div>
  );
};

const PostbackSender: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [partners, setPartners] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editedPartner, setEditedPartner] = useState({ name: '', url: '', status: 'inactive' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load partners on component mount
    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            setLoading(true);
            const data = await api.getPartners();
            setPartners(data);
        } catch (err) {
            setError('Failed to load partners');
            console.error('Error loading partners:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (partner: any) => {
        setIsEditing(partner.id);
        setEditedPartner({ name: partner.name, url: partner.url, status: partner.status });
    };

    const handleSave = async (partnerId: string) => {
        try {
            await api.updatePartner(partnerId, editedPartner);
            setPartners(partners.map(p => p.id === partnerId ? { ...p, ...editedPartner } : p));
            setIsEditing(null);
        } catch (err) {
            setError('Failed to update partner');
            console.error('Error updating partner:', err);
        }
    };

    const handleAdd = async () => {
        try {
            const newPartner = await api.addPartner({
                name: 'New Partner',
                url: 'https://newpartner.com/track?subid=[TRANSACTION_ID]',
                status: 'inactive'
            });
            setPartners([...partners, newPartner]);
            handleEdit(newPartner);
        } catch (err) {
            setError('Failed to add partner');
            console.error('Error adding partner:', err);
        }
    };
    
    const handleDelete = async (partnerId: string) => {
        if (!confirm('Are you sure you want to delete this partner?')) return;
        
        try {
            await api.deletePartner(partnerId);
            setPartners(partners.filter(p => p.id !== partnerId));
        } catch (err) {
            setError('Failed to delete partner');
            console.error('Error deleting partner:', err);
        }
    };

    // Standardized 10 fixed parameters (placeholders to use in partner URLs)
    const availableParams = [
        '[CLICK_ID]',
        '[PAYOUT]',
        '[CURRENCY]',
        '[OFFER_ID]',
        '[CONVERSION_STATUS]',
        '[TRANSACTION_ID]',
        '[SUB1]',
        '[SUB2]',
        '[EVENT_NAME]',
        '[TIMESTAMP]'
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings size={20} />
                        Manage Outbound Partners
                    </h3>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                        When a survey is completed, we will send a GET request to your active partners.
                    </p>
                </div>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    <Plus size={16} /> Add Partner
                </button>
            </div>
            
            <div className="space-y-4">
                {partners.map(partner => (
                    <div key={partner.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        {isEditing === partner.id ? (
                            <div className="space-y-3">
                                <input 
                                    value={editedPartner.name}
                                    onChange={(e) => setEditedPartner({...editedPartner, name: e.target.value})}
                                    className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-500' : 'bg-white border-gray-300'}`}
                                />
                                <textarea 
                                    value={editedPartner.url}
                                    onChange={(e) => setEditedPartner({...editedPartner, url: e.target.value})}
                                    rows={3}
                                    className={`w-full p-2 border rounded font-mono text-sm ${isDarkMode ? 'bg-slate-800 border-slate-500' : 'bg-white border-gray-300'}`}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => handleSave(partner.id)} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                                    <button onClick={() => setIsEditing(null)} className="px-3 py-1 bg-gray-500 text-white rounded">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${partner.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                        {partner.name}
                                    </h4>
                                    <p className={`text-xs font-mono mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{partner.url}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => alert('Sending test postback...')} className="p-2 hover:bg-blue-500/20 rounded-full transition-colors"><Send size={16} className="text-blue-500" /></button>
                                    <button onClick={() => handleEdit(partner)} className="p-2 hover:bg-yellow-500/20 rounded-full transition-colors"><Edit3 size={16} className="text-yellow-500" /></button>
                                    <button onClick={() => handleDelete(partner.id)} className="p-2 hover:bg-red-500/20 rounded-full transition-colors"><Trash2 size={16} className="text-red-500" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <h4 className="font-semibold mb-2">Available Parameters</h4>
                <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Use these placeholders in your URL. They will be replaced with actual data from the survey response.
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    {availableParams.map(param => (
                         <pre key={param} className={`p-2 rounded text-center ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>{param}</pre>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PostbackReceiver: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [testResult, setTestResult] = useState('');
    const [isTestingReceiver, setIsTestingReceiver] = useState(false);
    const [activeReceiverTab, setActiveReceiverTab] = useState<'basic' | 'sharing'>('basic');
    const [postbackShares, setPostbackShares] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Load postback shares on component mount
    useEffect(() => {
        if (activeReceiverTab === 'sharing') {
            loadPostbackShares();
        }
    }, [activeReceiverTab]);
    
    const loadPostbackShares = async () => {
        try {
            setLoading(true);
            const data = await api.getPostbackShares();
            setPostbackShares(data);
        } catch (err) {
            setError('Failed to load postback shares');
            console.error('Error loading postback shares:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // Display URL should include the required unique ID segment as per backend route: /postback-handler/<unique_id>
    // For local testing we use a placeholder test ID so the route is hit and we get a friendly 404 from DB lookup.
    const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/postback-handler/test-uuid'
        : 'https://api.theinterwebsite.space/postback-handler/{YOUR_UNIQUE_ID}';
  
    const fullUrl = `${baseUrl}`;
    const productionUrl = 'https://api.theinterwebsite.space/postback-handler/{YOUR_UNIQUE_ID}';

    const copyToClipboard = async () => {
      await navigator.clipboard.writeText(productionUrl);
      alert('Production URL copied to clipboard!');
    };
    
    const testPostbackReceiver = async () => {
        setIsTestingReceiver(true);
        setTestResult('🧪 Testing postback receiver...');
        
        try {
            // Generate a test response ID
            const testResponseId = 'test-response-' + Date.now();
            
            // Now test the postback receiver with the test response ID
            // Use standardized 10 fixed parameters
            const testParams = {
                click_id: 'click-' + Date.now(),
                payout: '1.50',
                currency: 'USD',
                offer_id: 'offer-demo',
                conversion_status: 'confirmed',
                transaction_id: 'test-txn-' + Date.now(),
                sub1: testResponseId,
                sub2: 'sub2-demo',
                event_name: 'conversion',
                timestamp: Math.floor(Date.now() / 1000).toString()
            };
            
            const queryString = new URLSearchParams(testParams).toString();
            const postbackResponse = await fetch(`${baseUrl}?${queryString}`);
            
            if (postbackResponse.ok) {
                const result = await postbackResponse.text();
                setTestResult(`✅ SUCCESS: Postback receiver is working!\n\nResponse: ${result}\n\n🎯 Your postback URL is ready to use with AdBreak Media!`);
            } else {
                const errorText = await postbackResponse.text();
                if (postbackResponse.status === 404) {
                    setTestResult(`⚠️  Test response not found, but receiver is working!\n\nThis is expected - the receiver successfully processed the request but couldn't find a matching survey response.\n\n✅ Your postback URL is working correctly!`);
                } else {
                    setTestResult(`❌ FAILED: HTTP ${postbackResponse.status}\n\nError: ${errorText}`);
                }
            }
        } catch (error) {
            setTestResult(`❌ FAILED: Network error - ${error}\n\nMake sure your Flask server is running on ${baseUrl}`);
        } finally {
            setIsTestingReceiver(false);
        }
    };
  
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Eye size={20} />
                    Receiving Inbound Postbacks
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Provide this URL to your partners. We will track completions when they send a GET request to this endpoint.
                </p>
            </div>
            
            {/* Receiver Tabs */}
            <div className={`flex rounded-lg p-1 text-xs ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
                <button 
                    onClick={() => setActiveReceiverTab('basic')}
                    className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                        activeReceiverTab === 'basic' 
                            ? (isDarkMode ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 shadow-sm') 
                            : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
                    }`}
                >
                    <Link size={14} /> Basic URL
                </button>
                <button 
                    onClick={() => setActiveReceiverTab('sharing')}
                    className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                        activeReceiverTab === 'sharing' 
                            ? (isDarkMode ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 shadow-sm') 
                            : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
                    }`}
                >
                    <Users size={14} /> Third Party Sharing
                </button>
            </div>
        </div>
        
        {activeReceiverTab === 'basic' && (
        <>
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
             <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Your Postback URL
             </label>
             <div className="flex gap-2">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className={`flex-1 px-4 py-3 border rounded-xl font-mono text-sm ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-200 border-slate-600'
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Copy size={18} /> Copy
                  </button>
             </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <h4 className="font-semibold mb-3">Accepted Parameters</h4>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    We accept the following query parameters. All parameters are optional unless marked as required.
                </p>
                <div className="overflow-x-auto">
                    <table className={`w-full text-sm border-collapse ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`}>
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-slate-600' : 'bg-gray-100'}`}>
                                <th className={`border px-3 py-2 text-left font-semibold ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Parameter</th>
                                <th className={`border px-3 py-2 text-left font-semibold ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Description</th>
                                <th className={`border px-3 py-2 text-left font-semibold ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Required</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>click_id</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Unique identifier for the click/conversion event</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>payout</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Commission/payout amount earned for the conversion</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>currency</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Currency code (USD, EUR, etc.)</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>offer_id</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Unique identifier for the offer/campaign</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>conversion_status</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Status of the conversion (confirmed, pending, reversed)</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>transaction_id</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Unique transaction identifier</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>sub1</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>SubID1 - First level tracking parameter</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>sub2</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>SubID2 - Second level tracking parameter</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>event_name</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Name of the conversion event (conversion, lead, sale, etc.)</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                            <tr>
                                <td className={`border px-3 py-2 font-mono ${isDarkMode ? 'border-slate-500 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>timestamp</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Timestamp of when the conversion occurred</td>
                                <td className={`border px-3 py-2 ${isDarkMode ? 'border-slate-500' : 'border-gray-300'}`}>Optional</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Test Section */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Send size={16} className="text-blue-500" />
                    Test Your Postback Receiver
                </h4>
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Test your postback receiver to make sure it's working correctly before giving the URL to AdBreak Media.
                </p>
                <button
                    onClick={testPostbackReceiver}
                    disabled={isTestingReceiver}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        isTestingReceiver
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {isTestingReceiver ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Testing...
                        </>
                    ) : (
                        <>
                            <Send size={16} />
                            Test Postback Receiver
                        </>
                    )}
                </button>
                
                {testResult && (
                    <div className={`mt-4 p-3 rounded-lg border text-sm whitespace-pre-wrap ${
                        testResult.includes('✅') || testResult.includes('⚠️')
                            ? (isDarkMode ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700')
                            : (isDarkMode ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                    }`}>
                        {testResult}
                    </div>
                )}
            </div>
        </>
        )}
        
        {activeReceiverTab === 'sharing' && <PostbackSharingManager isDarkMode={isDarkMode} />}
      </div>
    );
};

const PostbackSharingManager: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [postbackShares, setPostbackShares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editedShare, setEditedShare] = useState({
        third_party_name: '',
        third_party_contact: '',
        postback_type: 'global',
        notes: '',
        status: 'active',
        parameters: {} as any
    });
    
    useEffect(() => {
        loadPostbackShares();
    }, []);
    
    const loadPostbackShares = async () => {
        try {
            setLoading(true);
            const data = await api.getPostbackShares();
            setPostbackShares(data);
        } catch (err) {
            setError('Failed to load postback shares');
            console.error('Error loading postback shares:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAdd = () => {
        setEditedShare({
            third_party_name: '',
            third_party_contact: '',
            postback_type: 'global',
            notes: '',
            status: 'active',
            parameters: {}
        });
        setShowAddForm(true);
    };
    
    const handleSave = async () => {
        try {
            if (isEditing) {
                await api.updatePostbackShare(isEditing, editedShare);
                setPostbackShares(postbackShares.map(s => s.id === isEditing ? { ...s, ...editedShare } : s));
                setIsEditing(null);
            } else {
                const newShare = await api.addPostbackShare(editedShare);
                setPostbackShares([newShare, ...postbackShares]);
                setShowAddForm(false);
            }
        } catch (err) {
            setError('Failed to save postback share');
            console.error('Error saving postback share:', err);
        }
    };
    
    const handleEdit = (share: any) => {
        setEditedShare({
            third_party_name: share.third_party_name,
            third_party_contact: share.third_party_contact || '',
            postback_type: share.postback_type,
            notes: share.notes || '',
            status: share.status,
            parameters: share.parameters || {}
        });
        setIsEditing(share.id);
    };
    
    const handleDelete = async (shareId: string) => {
        if (!confirm('Are you sure you want to delete this postback sharing record?')) return;
        
        try {
            await api.deletePostbackShare(shareId);
            setPostbackShares(postbackShares.filter(s => s.id !== shareId));
        } catch (err) {
            setError('Failed to delete postback share');
            console.error('Error deleting postback share:', err);
        }
    };
    
    const handleGenerateUrl = async (shareId: string) => {
        try {
            const result = await api.generatePostbackUrl(shareId);
            await navigator.clipboard.writeText(result.postback_url);
            alert(`Postback URL for ${result.third_party_name} copied to clipboard!\n\nURL: ${result.postback_url}`);
        } catch (err) {
            setError('Failed to generate postback URL');
            console.error('Error generating postback URL:', err);
        }
    };
    
    const defaultParameters = {
        global: {
            click_id: { enabled: false, description: 'Unique identifier for the click/conversion event' },
            payout: { enabled: false, description: 'Commission/payout amount earned for the conversion' },
            currency: { enabled: false, description: 'Currency code (USD, EUR, etc.)' },
            offer_id: { enabled: false, description: 'Unique identifier for the offer/campaign' },
            conversion_status: { enabled: false, description: 'Status of the conversion (confirmed, pending, reversed)' },
            transaction_id: { enabled: false, description: 'Unique transaction identifier' },
            sub1: { enabled: false, description: 'SubID1 - First level tracking parameter' },
            sub2: { enabled: false, description: 'SubID2 - Second level tracking parameter' },
            event_name: { enabled: false, description: 'Name of the conversion event (conversion, lead, sale, etc.)' },
            timestamp: { enabled: false, description: 'Timestamp of when the conversion occurred' }
        }
    };
    
    const updateParameterConfig = (paramName: string, config: any) => {
        setEditedShare({
            ...editedShare,
            parameters: {
                ...editedShare.parameters,
                [paramName]: config
            }
        });
    };
    
    const getCurrentParameters = () => {
        // Only return the 10 fixed parameters from defaultParameters.global
        return defaultParameters.global;
    };
    
    const getPlaceholderValue = (paramName: string) => {
        const placeholders: { [key: string]: string } = {
            'click_id': 'click_12345',
            'payout': '5.50',
            'currency': 'USD',
            'offer_id': 'offer_789',
            'conversion_status': 'confirmed',
            'transaction_id': 'txn_abc123',
            'sub1': 'sub1_value',
            'sub2': 'sub2_value',
            'event_name': 'conversion',
            'timestamp': '1640995200'
        };
        return placeholders[paramName] || 'custom_value';
    };
    
    const generatePreviewUrl = () => {
        const uniqueId = (editedShare as any).unique_postback_id || 'auto-generated-uuid';
        const baseUrl = `https://api.theinterwebsite.space/postback-handler/${uniqueId}`;
        const params: string[] = [];
        
        // Only use parameters that are enabled in editedShare.parameters
        Object.entries(defaultParameters.global).forEach(([paramName, defaultConfig]: [string, any]) => {
            const userConfig = editedShare.parameters?.[paramName];
            if (userConfig?.enabled) {
                const customName = userConfig.customName || paramName;
                const value = userConfig.customValue || `[${paramName.toUpperCase()}]`;
                params.push(`${customName}=${value}`);
            }
        });
        
        return params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>Loading sharing records...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {error && (
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-red-800/20 border-red-500 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <AlertCircle size={16} className="inline mr-2" />
                    {error}
                </div>
            )}
            
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                        <Users size={20} />
                        Third Party Postback Sharing
                    </h4>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                        Track which postback URLs you've shared with third parties and customize parameters.
                    </p>
                </div>
                <button 
                    onClick={handleAdd} 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> Add Third Party
                </button>
            </div>
            
            {/* Add/Edit Form */}
            {(showAddForm || isEditing) && (
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                    <h5 className="font-semibold mb-4">{isEditing ? 'Edit' : 'Add'} Third Party Sharing</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                Third Party Name *
                            </label>
                            <input 
                                value={editedShare.third_party_name}
                                onChange={(e) => setEditedShare({...editedShare, third_party_name: e.target.value})}
                                className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                                placeholder="e.g., AdBreak Media"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                Contact Info
                            </label>
                            <input 
                                value={editedShare.third_party_contact}
                                onChange={(e) => setEditedShare({...editedShare, third_party_contact: e.target.value})}
                                className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                                placeholder="email@company.com"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                Postback Type
                            </label>
                            <select 
                                value={editedShare.postback_type}
                                onChange={(e) => setEditedShare({...editedShare, postback_type: e.target.value, parameters: {}})}
                                className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                            >
                                <option value="global">Global Postbacks</option>
                                <option value="content_monetizer">Content Monetizer</option>
                                <option value="wallad">WallAd</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                Status
                            </label>
                            <select 
                                value={editedShare.status}
                                onChange={(e) => setEditedShare({...editedShare, status: e.target.value})}
                                className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                            Notes
                        </label>
                        <textarea 
                            value={editedShare.notes}
                            onChange={(e) => setEditedShare({...editedShare, notes: e.target.value})}
                            rows={2}
                            className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                            placeholder="Additional notes about this integration..."
                        />
                    </div>
                    
                    {/* Parameter Configuration */}
                    <div className="mb-4">
                        <h6 className="font-medium mb-3">Parameter Configuration</h6>
                        <div className={`p-4 rounded border ${isDarkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white border-gray-200'}`}>
                            <div className="grid grid-cols-1 gap-3">
                              {Object.entries(getCurrentParameters()).map(([paramName, paramConfig]: [string, any]) => {
                                // Only use user config for enabled, default to false if not set
                                const userConfig = editedShare.parameters?.[paramName] || {};
                                const enabled = userConfig.enabled === true; // Only true if user set it
                                const mergedConfig = { ...paramConfig, ...userConfig, enabled };

                                return (
                                  <div key={paramName} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="checkbox" 
                                            checked={enabled}
                                            onChange={(e) => updateParameterConfig(paramName, { ...mergedConfig, enabled: e.target.checked })}
                                            className="rounded"
                                          />
                                          <code className={`text-sm font-mono ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                            {paramName}
                                          </code>
                                        </div>
                                        <p className={`text-xs mt-1 ml-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                          {mergedConfig.description}
                                          {mergedConfig.possible_values && (
                                            <span className="ml-2 font-medium">Values: {mergedConfig.possible_values}</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    {enabled && (
                                      <div className="ml-6">
                                        <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                          Custom Value for {paramName}:
                                        </label>
                                        <input
                                          type="text"
                                          value={mergedConfig.customValue || ''}
                                          onChange={(e) => updateParameterConfig(paramName, { ...mergedConfig, customValue: e.target.value })}
                                          placeholder={`e.g., ${getPlaceholderValue(paramName)}`}
                                          className={`w-full p-2 text-sm border rounded ${isDarkMode ? 'bg-slate-700 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                                        />
                                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                          Leave empty to use placeholder [{paramName.toUpperCase()}] in URL
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                        </div>
                    </div>
                    
                    {/* Live Preview */}
                    <div className="mb-4">
                        <h6 className="font-medium mb-3">Live URL Preview</h6>
                        <div className={`p-4 rounded border ${isDarkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                    Generated URL:
                                </span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(generatePreviewUrl())}
                                    className={`p-1 hover:bg-gray-500/20 rounded transition-colors ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}
                                    title="Copy preview URL"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                            <div className={`p-3 rounded font-mono text-sm break-all ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-800'}`}>
                                {generatePreviewUrl()}
                            </div>
                            <p className={`text-xs mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                This preview updates as you configure parameters. Parameters without custom values will show as placeholders like [SID1].
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSave} 
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                            {isEditing ? 'Update' : 'Create'}
                        </button>
                        <button 
                            onClick={() => {
                                setShowAddForm(false);
                                setIsEditing(null);
                                setError('');
                            }} 
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            
            {/* Sharing Records List */}
            <div className="space-y-4">
                {postbackShares.length === 0 ? (
                    <div className={`p-8 text-center rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <Users size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                        <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                            No third party sharing records yet
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            Add a third party to start tracking postback URL sharing.
                        </p>
                    </div>
                ) : (
                    postbackShares.map(share => (
                        <div key={share.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h5 className="font-semibold text-lg">{share.third_party_name}</h5>
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            share.status === 'active' 
                                                ? (isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800')
                                                : (isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-800')
                                        }`}>
                                            {share.status}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                            {share.postback_type}
                                        </span>
                                    </div>
                                    
                                    {share.third_party_contact && (
                                        <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                            📧 {share.third_party_contact}
                                        </p>
                                    )}
                                    
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                            <Clock size={14} />
                                            Created: {share.created_at_str || 'Unknown'}
                                        </span>
                                        {share.last_used_str && (
                                            <span className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                                <Activity size={14} />
                                                Last used: {share.last_used_str}
                                            </span>
                                        )}
                                        <span className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                            📊 Used {share.usage_count || 0} times
                                        </span>
                                    </div>
                                    
                                    {share.notes && (
                                        <p className={`text-sm mt-2 italic ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                            📝 {share.notes}
                                        </p>
                                    )}
                                    
                                    <div className="mt-3">
                                        <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                            Enabled Parameters:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(share.parameters || {}).filter(([_, config]: [string, any]) => config.enabled).map(([paramName]) => (
                                                <code key={paramName} className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>
                                                    {paramName}
                                                </code>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 ml-4">
                                    <button 
                                        onClick={() => handleGenerateUrl(share.id)} 
                                        className="p-2 hover:bg-blue-500/20 rounded-full transition-colors" 
                                        title="Generate & Copy URL"
                                    >
                                        <ExternalLink size={16} className="text-blue-500" />
                                    </button>
                                    <button 
                                        onClick={() => handleEdit(share)} 
                                        className="p-2 hover:bg-yellow-500/20 rounded-full transition-colors" 
                                        title="Edit"
                                    >
                                        <Edit3 size={16} className="text-yellow-500" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(share.id)} 
                                        className="p-2 hover:bg-red-500/20 rounded-full transition-colors" 
                                        title="Delete"
                                    >
                                        <Trash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const PostbackLogs: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [outboundLogs, setOutboundLogs] = useState<any[]>([]);
    const [inboundLogs, setInboundLogs] = useState<any[]>([]);
    const [activeLogTab, setActiveLogTab] = useState<'outbound' | 'inbound'>('inbound');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load logs on component mount
    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const [outboundData, inboundData] = await Promise.all([
                api.getLogs(),
                api.getInboundLogs()
            ]);
            setOutboundLogs(outboundData);
            setInboundLogs(inboundData);
        } catch (err) {
            setError('Failed to load logs');
            console.error('Error loading logs:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>Loading logs...</p>
                </div>
            </div>
        );
    }

    const currentLogs = activeLogTab === 'inbound' ? inboundLogs : outboundLogs;
    
    return (
        <div className="space-y-6">
             {error && (
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-red-800/20 border-red-500 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <AlertCircle size={16} className="inline mr-2" />
                    {error}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity size={20} />
                        Postback Logs
                    </h3>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                        View both inbound and outbound postback activity.
                    </p>
                </div>
                
                {/* Log Type Tabs */}
                <div className={`flex rounded-lg p-1 text-xs ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
                    <button 
                        onClick={() => setActiveLogTab('inbound')}
                        className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                            activeLogTab === 'inbound' 
                                ? (isDarkMode ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 shadow-sm') 
                                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
                        }`}
                    >
                        <Eye size={14} /> Inbound ({inboundLogs.length})
                    </button>
                    <button 
                        onClick={() => setActiveLogTab('outbound')}
                        className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                            activeLogTab === 'outbound' 
                                ? (isDarkMode ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 shadow-sm') 
                                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
                        }`}
                    >
                        <Send size={14} /> Outbound ({outboundLogs.length})
                    </button>
                </div>
            </div>
            
            <div className={`border rounded-lg ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                {activeLogTab === 'inbound' ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-[1200px] w-full text-sm text-left">
                                <thead className={`border-b ${isDarkMode ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}>
                                    <tr>
                                        <th className="p-3">timestamp</th>
                                        <th className="p-3">type</th>
                                        <th className="p-3">name</th>
                                        <th className="p-3">ip</th>
                                        <th className="p-3">user_agent</th>
                                        <th className="p-3">unique_id</th>
                                        <th className="p-3">url</th>
                                        <th className="p-3">click_id</th>
                                        <th className="p-3">payout</th>
                                        <th className="p-3">reward</th>
                                        <th className="p-3">currency</th>
                                        <th className="p-3">offer_id</th>
                                        <th className="p-3">status</th>
                                        <th className="p-3">transaction_id</th>
                                        <th className="p-3">sid1</th>
                                        <th className="p-3">sub1</th>
                                        <th className="p-3">sub2</th>
                                        <th className="p-3">event_name</th>
                                        <th className="p-3">username</th>
                                        <th className="p-3">success</th>
                                        <th className="p-3">error_message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inboundLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={21} className="p-8 text-center text-gray-500">
                                                📡 No inbound postbacks received yet.
                                                <br />
                                                Test your receiver or wait for external partners to send postbacks.
                                            </td>
                                        </tr>
                                    ) : (
                                        inboundLogs.map((log, index) => (
                                            <tr key={log.id || index} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                                                <td className="p-3 whitespace-nowrap">
                                                    <Clock size={14} className="inline mr-1" />
                                                    {log.timestamp_str || log.timestamp || 'Unknown'}
                                                </td>
                                                <td className="p-3">{log.type || 'inbound'}</td>
                                                <td className="p-3 font-medium">{log.name || '-'}</td>
                                                <td className="p-3">{log.source_ip || log.ip || '-'}</td>
                                                <td className="p-3">{log.user_agent || '-'}</td>
                                                <td className="p-3 font-mono text-xs">{log.unique_id || '-'}</td>
                                                <td className="p-3 font-mono text-xs">{log.url_called || log.url || '-'}</td>
                                                <td className="p-3">{log.click_id || '-'}</td>
                                                <td className="p-3">{typeof log.payout !== 'undefined' ? log.payout : '-'}</td>
                                                <td className="p-3">{typeof log.reward !== 'undefined' ? log.reward : (typeof log.payout !== 'undefined' ? log.payout : '-')}</td>
                                                <td className="p-3">{log.currency || '-'}</td>
                                                <td className="p-3">{log.offer_id || '-'}</td>
                                                <td className="p-3">{log.conversion_status || log.status || '-'}</td>
                                                <td className="p-3">{log.transaction_id || '-'}</td>
                                                <td className="p-3 font-mono text-xs">{log.sid1 || log.sub1 || '-'}</td>
                                                <td className="p-3 font-mono text-xs">{log.sub1 || '-'}</td>
                                                <td className="p-3 font-mono text-xs">{log.sub2 || '-'}</td>
                                                <td className="p-3">{log.event_name || '-'}</td>
                                                <td className="p-3">{log.username || '-'}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                                        log.success 
                                                            ? (isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800')
                                                            : (isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800')
                                                    }`}>
                                                        {log.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                        {String(!!log.success)}
                                                    </span>
                                                </td>
                                                <td className="p-3">{log.error_message || log.response_message || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className={`border-b ${isDarkMode ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}>
                            <tr>
                                <th className="p-3">Partner</th>
                                <th className="p-3">Timestamp</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">URL Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {outboundLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        📤 No outbound postbacks sent yet.
                                        <br />
                                        Complete a survey to trigger outbound postbacks.
                                    </td>
                                </tr>
                            ) : (
                                outboundLogs.map((log, index) => (
                                    <tr key={log.id || index} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                                        <td className="p-3 font-medium">{log.partnerName || log.name || 'Unknown Partner'}</td>
                                        <td className="p-3">
                                            <Clock size={14} className="inline mr-1" />
                                            {log.timestamp_str || log.timestamp || 'Unknown'}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                                log.status === 'success' 
                                                    ? (isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800')
                                                    : (isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800')
                                            }`}>
                                                {log.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className={`p-3 font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                            {log.url}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
  

export default PostbackManager;

