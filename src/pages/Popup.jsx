import { useState } from "react";
import { Image, Mail, ChevronRight } from "lucide-react";

export default function App() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1.5 rounded-lg shadow-md mr-2">
            <Image className="w-4 h-4 text-white" />
          </div>
          <div className="relative">
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Dynamic Email GIF
            </h1>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-sm">
          v1.1
        </div>
      </div>

      <p className="text-gray-700 mb-4 text-sm leading-relaxed">
        Instantly generate and insert perfect GIFs directly into your Gmail and Outlook messages. 
        Spice up your emails with just one click!
      </p>

      <div className="flex justify-center mb-4">
        <div className="flex space-x-6 items-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600">Gmail</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#0078D4" d="M23.5 12a11.5 11.5 0 1 1-23 0 11.5 11.5 0 0 1 23 0zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600">Outlook</span>
          </div>
        </div>
      </div>

      <div
        className="bg-white p-4 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 flex-1 flex items-center justify-center cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center justify-center text-gray-700 font-medium text-base mb-2">
            <Mail className="w-4 h-4 mr-2 text-purple-500" />
            <span className="mr-1">Open any email composer</span>
            <ChevronRight
              className={`w-4 h-4 text-pink-500 transition-all duration-300 ${
                isHovering ? "transform translate-x-1" : ""
              }`}
            />
          </div>
          <p className="text-sm text-gray-500">to start adding perfect GIFs!</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-center space-x-2 mb-2">
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm hover:opacity-90 transition-opacity">
            Settings
          </button>
          <button className="bg-white text-gray-700 text-xs px-3 py-1 rounded-full font-medium shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
            Help
          </button>
        </div>
        <p className="text-xs text-center text-gray-500">
          Make your emails more expressive with the perfect GIF
        </p>
      </div>
    </div>
  );
}