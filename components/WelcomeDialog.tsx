'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface WelcomeDialogProps {
  onClose: () => void;
  isOpen: boolean;
}

export default function WelcomeDialog({ onClose, isOpen }: WelcomeDialogProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-4">
          <h2 className="text-2xl font-bold text-white">Welcome!</h2>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Privacy notice */}
          <div className="bg-white/5 rounded-xl p-4 border border-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Your Data Stays Private</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  All PDF processing happens locally in your browser. Your data is <strong className="text-white">never sent to any external server or API</strong>. 
                  Everything stays on your device.
                </p>
              </div>
            </div>
          </div>

          {/* Format support notice */}
          <div className="bg-white/5 rounded-xl p-4 border border-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Supported Format</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  This tool currently supports <strong className="text-white">myBCA mutation statement PDF format only</strong>. 
                  Other bank statement formats are not supported yet.
                </p>
              </div>
            </div>
            {/* Supported bank icon */}
            <div className="mt-4 flex justify-center">
              <div className="w-14 h-14 relative rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="/images/bca-icon.png"
                  alt="myBCA"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
          >
            Got it, let&apos;s start!
          </button>
        </div>
      </div>
    </div>
  );
}
