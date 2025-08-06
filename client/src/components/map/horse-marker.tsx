import React from "react";
import { Horse } from "@shared/schema";

interface HorseMarkerProps {
  horse: Horse;
  size?: number;
  onClick?: () => void;
}

// SVG component for horse head icon
function HorseHeadIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Horse head silhouette */}
      <path
        d="M12 2C8.5 2 6 4.5 6 8C6 9.5 6.5 10.8 7.3 11.8L6.8 12.5C6.5 13 6.5 13.6 6.8 14.1L7.5 15.2C7.8 15.7 8.4 16 9 16H15C15.6 16 16.2 15.7 16.5 15.2L17.2 14.1C17.5 13.6 17.5 13 17.2 12.5L16.7 11.8C17.5 10.8 18 9.5 18 8C18 4.5 15.5 2 12 2Z"
        fill={color}
        stroke="white"
        strokeWidth="1"
      />
      {/* Horse ears */}
      <path
        d="M10 4.5C10 4.2 10.2 4 10.5 4C10.8 4 11 4.2 11 4.5V6C11 6.3 10.8 6.5 10.5 6.5C10.2 6.5 10 6.3 10 6V4.5Z"
        fill={color}
        stroke="white"
        strokeWidth="0.5"
      />
      <path
        d="M13 4.5C13 4.2 13.2 4 13.5 4C13.8 4 14 4.2 14 4.5V6C14 6.3 13.8 6.5 13.5 6.5C13.2 6.5 13 6.3 13 6V4.5Z"
        fill={color}
        stroke="white"
        strokeWidth="0.5"
      />
      {/* Horse mane */}
      <path
        d="M8 6C8.5 5.5 9 5.2 9.5 5C10 4.8 10.5 4.5 11 4.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 6C15.5 5.5 15 5.2 14.5 5C14 4.8 13.5 4.5 13 4.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Horse eyes */}
      <circle cx="10" cy="8" r="0.8" fill="white" />
      <circle cx="14" cy="8" r="0.8" fill="white" />
      <circle cx="10" cy="8" r="0.4" fill="#333" />
      <circle cx="14" cy="8" r="0.4" fill="#333" />
      {/* Horse nose */}
      <ellipse cx="12" cy="11" rx="1" ry="0.5" fill="#333" opacity="0.8" />
    </svg>
  );
}

// Creates a DOM element for the horse marker
export function createHorseMarkerElement(horse: Horse, size: number = 32): HTMLElement {
  const statusColors = {
    active: horse.markerColor || '#22c55e',
    warning: '#eab308',
    offline: '#ef4444',
  };

  const markerColor = statusColors[horse.status as keyof typeof statusColors] || statusColors.active;

  // Create main container
  const container = document.createElement('div');
  container.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    position: relative;
    cursor: pointer;
    transform-origin: center bottom;
    transition: transform 0.2s ease;
  `;

  // Create circular background
  const background = document.createElement('div');
  background.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: ${markerColor};
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  `;

  // Create horse icon
  const iconContainer = document.createElement('div');
  iconContainer.innerHTML = `
    <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Horse head silhouette -->
      <path
        d="M12 2C8.5 2 6 4.5 6 8C6 9.5 6.5 10.8 7.3 11.8L6.8 12.5C6.5 13 6.5 13.6 6.8 14.1L7.5 15.2C7.8 15.7 8.4 16 9 16H15C15.6 16 16.2 15.7 16.5 15.2L17.2 14.1C17.5 13.6 17.5 13 17.2 12.5L16.7 11.8C17.5 10.8 18 9.5 18 8C18 4.5 15.5 2 12 2Z"
        fill="white"
        stroke="none"
      />
      <!-- Horse ears -->
      <path
        d="M10 4.5C10 4.2 10.2 4 10.5 4C10.8 4 11 4.2 11 4.5V6C11 6.3 10.8 6.5 10.5 6.5C10.2 6.5 10 6.3 10 6V4.5Z"
        fill="white"
      />
      <path
        d="M13 4.5C13 4.2 13.2 4 13.5 4C13.8 4 14 4.2 14 4.5V6C14 6.3 13.8 6.5 13.5 6.5C13.2 6.5 13 6.3 13 6V4.5Z"
        fill="white"
      />
      <!-- Horse eyes -->
      <circle cx="10" cy="8" r="0.6" fill="#333" />
      <circle cx="14" cy="8" r="0.6" fill="#333" />
      <!-- Horse nose -->
      <ellipse cx="12" cy="11" rx="0.8" ry="0.4" fill="#666" />
    </svg>
  `;

  background.appendChild(iconContainer);

  // Create status indicator dot
  const statusDot = document.createElement('div');
  statusDot.style.cssText = `
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid white;
    background: ${horse.status === 'active' ? '#22c55e' : 
                 horse.status === 'warning' ? '#eab308' : '#ef4444'};
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `;

  background.appendChild(statusDot);
  container.appendChild(background);

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute;
    bottom: ${size + 8}px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
    z-index: 1000;
  `;
  tooltip.textContent = `${horse.name} • ${horse.breed}`;
  container.appendChild(tooltip);

  // Add hover effects
  container.addEventListener('mouseenter', () => {
    container.style.transform = 'scale(1.1)';
    tooltip.style.opacity = '1';
  });

  container.addEventListener('mouseleave', () => {
    container.style.transform = 'scale(1)';
    tooltip.style.opacity = '0';
  });

  return container;
}

export default function HorseMarker({ horse, size = 24, onClick }: HorseMarkerProps) {
  const statusColors = {
    active: horse.markerColor || '#22c55e',
    warning: '#eab308', 
    offline: '#ef4444',
  };

  const markerColor = statusColors[horse.status as keyof typeof statusColors] || statusColors.active;

  return (
    <div
      className="relative cursor-pointer hover:scale-110 transition-transform duration-200"
      style={{ width: size, height: size }}
      onClick={onClick}
      data-testid={`horse-marker-${horse.id}`}
    >
      {/* Circular background */}
      <div
        className="w-full h-full rounded-full border-2 border-white shadow-lg flex items-center justify-center relative"
        style={{ backgroundColor: markerColor }}
      >
        {/* Horse icon */}
        <HorseHeadIcon color="white" size={size * 0.6} />
        
        {/* Status indicator */}
        <div
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white shadow-sm"
          style={{
            backgroundColor: horse.status === 'active' ? '#22c55e' : 
                           horse.status === 'warning' ? '#eab308' : '#ef4444'
          }}
        />
      </div>
    </div>
  );
}