import { useState, useEffect } from 'react';

/**
 * @param {Object} props
 * @param {boolean} props.isLoading 
 * @param {string} props.message 
 * @param {number} props.duration 
 */
export default function ProgressBar({ isLoading, message, duration = 20000 }) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    
    setProgress(0);
    
    const totalSteps = 50;
    const intervalTime = duration / totalSteps;
    const increment = 90 / totalSteps;
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += increment;
      

      if (currentProgress > 90) {
        currentProgress = 90;
        clearInterval(interval);
      }
      
      setProgress(currentProgress);
    }, intervalTime);
    
    return () => {
      clearInterval(interval);
     
      if (isLoading) {
        setProgress(100);
      }
    };
  }, [isLoading, duration]);
  
  if (!isLoading && progress === 0) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">{message || 'Processing repository...'}</span>
        <span className="text-sm font-medium">{Math.round(progress)}%</span>
      </div>
      
      <div className="h-4 bg-gray-100 border-2 border-black rounded-lg overflow-hidden shadow-[2px_2px_0px_0px_black]">
        <div
          className="h-full bg-[#FFC480] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <p className="text-xs text-gray-600 mt-2">
        This may take a few minutes depending on repository size
      </p>
    </div>
  );
}