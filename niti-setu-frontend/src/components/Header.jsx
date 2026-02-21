import React from 'react';
import { Leaf } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-green-700 text-white p-4 shadow-md flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Leaf size={28} />
        <h1 className="text-xl font-bold">Niti-Setu</h1>
      </div>
    </header>
  );
};

export default Header;
