import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

interface Announcement {
  _id: string;
  text: string;
  sentBy: string;
  teamId: string;
  createdAt: string;
}

interface AnnouncementSliderProps {
  announcement: Announcement;
  onDismiss: () => void;
}

export function AnnouncementSlider({
  announcement,
  onDismiss,
}: AnnouncementSliderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play notification sound
    const playNotificationSound = () => {
      // Create a simple notification sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Create oscillators for a pleasant notification sound
        const now = audioContext.currentTime;

        // First note - higher pitch
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 800;
        osc1.type = "sine";
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Second note - slightly lower pitch
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 1000;
          osc2.type = "sine";
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.3);
        }, 150);
      } catch (error) {
        console.log("Audio notification not available");
      }
    };

    playNotificationSound();

    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(), 400); // Wait for animation to complete
    }, 8000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <style>{`
        @keyframes slideInAnnouncement {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutAnnouncement {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .announcement-slider {
          animation: slideInAnnouncement 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .announcement-slider.exit {
          animation: slideOutAnnouncement 0.4s ease-in-out;
        }

        .announcement-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow: hidden;
        }

        .announcement-content::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          animation: pulse 3s ease-in-out infinite;
        }

        .announcement-content::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -5%;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          animation: pulse 4s ease-in-out infinite 0.5s;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .announcement-icon {
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>

      <div className="announcement-slider bg-gradient-to-r from-purple-600 to-pink-600 shadow-2xl">
        <div className="announcement-content relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="announcement-icon flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white/20">
                <Megaphone className="h-6 w-6 text-white animate-pulse" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">
                Team Announcement
              </h3>
              <p className="mt-1 text-sm text-white/90 line-clamp-2">
                {announcement.text}
              </p>
            </div>

            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onDismiss(), 400);
              }}
              className="flex-shrink-0 inline-flex text-white/70 hover:text-white transition-colors duration-200 focus:outline-none"
              aria-label="Dismiss announcement"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
