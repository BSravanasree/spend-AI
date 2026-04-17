import React from 'react';
import Sidebar from '../components/Sidebar';

export default function Docs() {
    const PROXY_URL = 'https://spendai-2-0.onrender.com/v1';

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="main-content">
                <div className="topbar">
                    <div className="topbar-left">
                        <h1 className="page-title">Documentation</h1>
                        <p className="page-sub">Quick start guide and API reference</p>
                    </div>
                </div>

                <div className="max-w-4xl space-y-12 pb-20">
                    {/* Setup steps */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-white border-b border-[#222] pb-2">Getting Started</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { step: 1, title: 'Add API Provider Key', desc: 'Go to Settings and add your OpenAI, Anthropic, or Gemini key.' },
                                { step: 2, title: 'Create a Project', desc: 'Manage budget and tracking in the Projects tab.' },
                                { step: 3, title: 'Generate Proxy Key', desc: 'Get a unique sk-sp-xxxxxxxx key for your project.' },
                                { step: 4, title: 'Switch Base URL', desc: 'Pointing your SDK to SpendAI activates tracking.' }
                            ].map(item => (
                                <div key={item.step} className="bg-[#111] border border-[#222] p-5 rounded-xl">
                                    <div className="w-8 h-8 bg-[#5b6af7] text-white rounded-lg flex items-center justify-center font-bold mb-4">{item.step}</div>
                                    <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-500 line-height-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Code instances */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-white">Integration Examples</h2>

                        <div className="space-y-8">
                            {/* Node.js */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">JavaScript / Node.js</h3>
                                <pre className="bg-[#0f0f0f] border border-[#222] p-4 rounded-lg text-sm text-blue-300 overflow-x-auto">
                                    {`// Install: npm install openai
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: 'sk-sp-your-proxy-key', // Use your SpendAI proxy key
  baseURL: '${PROXY_URL}'
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  });
  console.log(completion.choices[0].message);
}`}
                                </pre>
                            </div>

                            {/* Python */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Python</h3>
                                <pre className="bg-[#0f0f0f] border border-[#222] p-4 rounded-lg text-sm text-green-300 overflow-x-auto">
                                    {`from openai import OpenAI

client = OpenAI(
  api_key="sk-sp-your-proxy-key",
  base_url="${PROXY_URL}"
)

completion = client.chat.completions.create(
  model="gpt-4o",
  messages=[{"role": "user", "content": "Hello!"}]
)

print(completion.choices[0].message)`}
                                </pre>
                            </div>

                            {/* cURL */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">cURL</h3>
                                <pre className="bg-[#0f0f0f] border border-[#222] p-4 rounded-lg text-sm text-orange-300 overflow-x-auto">
                                    {`curl ${PROXY_URL}/chat/completions \\
  -H "Authorization: Bearer sk-sp-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role":"user","content":"Hello!"}]
  }'`}
                                </pre>
                            </div>
                        </div>
                    </section>

                    {/* Models Table */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-white">Model Cost Reference</h2>
                        <div className="overflow-hidden border border-[#222] rounded-xl">
                            <table className="w-full text-left text-sm text-gray-400 border-collapse">
                                <thead className="bg-[#111] text-gray-300">
                                    <tr>
                                        <th className="p-4 border-b border-[#222]">Provider</th>
                                        <th className="p-4 border-b border-[#222]">Model</th>
                                        <th className="p-4 border-b border-[#222]">Input (1M)</th>
                                        <th className="p-4 border-b border-[#222]">Output (1M)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[#0a0a0b]">
                                    {[
                                        { p: 'OpenAI', m: 'gpt-4o', i: '$2.50', o: '$10.00' },
                                        { p: 'OpenAI', m: 'gpt-4o-mini', i: '$0.15', o: '$0.60' },
                                        { p: 'Anthropic', m: 'claude-3-5-sonnet', i: '$3.00', o: '$15.00' },
                                        { p: 'Anthropic', m: 'claude-3-haiku', i: '$0.25', o: '$1.25' },
                                        { p: 'Google', m: 'gemini-1.5-pro', i: '$1.25', o: '$5.00' },
                                        { p: 'Google', m: 'gemini-1.5-flash', i: '$0.075', o: '$0.30' },
                                        { p: 'Google', m: 'gemini-2.0-flash', i: '$0.10', o: '$0.40' }
                                    ].map((row, idx) => (
                                        <tr key={idx} className="border-b border-[#222]/50 hover:bg-[#111]/50 transition-colors">
                                            <td className="p-4 text-xs font-medium uppercase tracking-tighter text-gray-500">{row.p}</td>
                                            <td className="p-4 font-mono text-white">{row.m}</td>
                                            <td className="p-4">{row.i}</td>
                                            <td className="p-4">{row.o}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Error Codes */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-white">Error Reference</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { code: '401', title: 'Invalid Proxy Key', desc: 'Your key is invalid or revoked. Generate a new one in Projects.' },
                                { code: '429', title: 'Budget Exceeded', desc: 'Your limit is exhausted. Increase your budget in settings.' },
                                { code: '400', title: 'Provider Not Set', desc: 'Configure your primary provider API key in settings.' }
                            ].map(err => (
                                <div key={err.code} className="p-4 bg-red-900/5 border border-red-900/20 rounded-lg">
                                    <div className="text-red-500 font-bold mb-1">{err.code}</div>
                                    <div className="text-gray-200 text-sm font-semibold mb-1">{err.title}</div>
                                    <p className="text-xs text-gray-500">{err.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
