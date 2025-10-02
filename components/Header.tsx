import React from 'react';
import { SparklesIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="bg-brand-gray-800/30 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <SparklesIcon className="h-8 w-8 text-brand-blue-light" />
            <h1 className="ml-3 text-2xl font-bold text-white">
              Bulk AI Image Generator
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
