import { useEffect, useState } from "react";

interface CursorFollowerProps {
  userName: string | undefined;
}

export const CursorFollower = ({ userName }: CursorFollowerProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  if (!isVisible || !userName) return null;

  const letters = userName.toUpperCase().replace(/\s/g, "").split("");
  const radius = 56;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)",
        transition: "all 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      <style>{`
        @keyframes orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes neonGlow {
          0%, 100% {
            text-shadow: 0 0 7px #00ff00, 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00;
          }
          50% {
            text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00;
          }
        }
      `}</style>

      <div
        className="relative w-56 h-56"
        style={{
          animation: "orbit 8s linear infinite",
        }}
      >
        {letters.map((letter, index) => {
          const angle = (index / letters.length) * 360;
          const x = radius * Math.cos((angle * Math.PI) / 180);
          const y = radius * Math.sin((angle * Math.PI) / 180);

          return (
            <div
              key={index}
              className="absolute text-lg font-bold"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                color: "#00ff00",
                textShadow:
                  "0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00",
                animation: "neonGlow 2s ease-in-out infinite",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }}
            >
              {letter}
            </div>
          );
        })}
      </div>
    </div>
  );
};
