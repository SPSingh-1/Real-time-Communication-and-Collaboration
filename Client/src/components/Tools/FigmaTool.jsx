import React from 'react';

const FigmaTool = () => (
  <div className="tool-container">
    <h2>Figma - Collaborative Design Tool</h2>
    <p>Figma allows real-time collaboration in UI/UX design. You can embed Figma files here.</p>
    <iframe
      src="https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/xyz123"
      style={{ width: '100%', height: '500px', border: 'none' }}
      allowFullScreen
    ></iframe>
  </div>
);

export default FigmaTool;
