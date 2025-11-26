import React, { useState } from 'react';
import { Key, Lock, CheckCircle2 } from 'lucide-react';
import { Button, Input } from './UI';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().length < 10) {
      setError('Please enter a valid API key.');
      return;
    }
    onSave(key.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl">
        <div className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-indigo-500/10 p-4">
              <Key className="h-8 w-8 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Enter Gemini API Key</h2>
              <p className="text-sm text-zinc-400">
                To generate unlimited designs, you need your own Google Cloud Gemini API key. 
                New accounts get $300 in free credits.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Input 
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError('');
                }}
                type="password"
                placeholder="AIzaSy..."
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            
            <Button type="submit" className="w-full">
              Get Started
            </Button>
          </form>

          <div className="mt-6 border-t border-zinc-800 pt-6">
            <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-500">Why do I need this?</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                <span>Access to Gemini 2.5 & 3.0 models</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                <span>Full privacy & ownership of designs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                <span>High-speed bulk generation</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
