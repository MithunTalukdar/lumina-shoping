import React from 'react';

interface LuminaMarkProps {
  className?: string;
}

const LuminaMark: React.FC<LuminaMarkProps> = ({ className = '' }) => {
  const classes = ['lumina-mark', className].filter(Boolean).join(' ');

  return (
    <span aria-hidden="true" className={classes}>
      <span className="lumina-mark__grid" />
      <span className="lumina-mark__halo" />
      <span className="lumina-mark__diamond" />
      <span className="lumina-mark__stem" />
      <span className="lumina-mark__base" />
      <span className="lumina-mark__spark" />
      <span className="lumina-mark__spark lumina-mark__spark--secondary" />
      <span className="lumina-mark__dot" />
    </span>
  );
};

export default LuminaMark;
