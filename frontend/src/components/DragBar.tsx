import React, { useEffect, useRef } from 'react';
import './DragBar.css';

const DragBar: React.FC = () => {
  const dragBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dragBarRef.current) {
      // Set the webkit-app-region style directly on the DOM element
      dragBarRef.current.style.setProperty('-webkit-app-region', 'drag');
    }
  }, []);

  return <div ref={dragBarRef} className="drag-bar" />;
};

export default DragBar;
