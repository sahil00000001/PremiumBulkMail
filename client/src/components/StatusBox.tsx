import { cn } from "@/lib/utils";
import { CheckIcon, XIcon, MailIcon, MailOpenIcon, ClockIcon } from "lucide-react";

interface StatusBoxProps {
  status: string;
  openedAt?: string | null;
  className?: string;
}

export default function StatusBox({ status, openedAt, className }: StatusBoxProps) {
  // Determine the actual display status
  const displayStatus = status === "sent" && openedAt ? "opened" : status;
  
  return (
    <div
      className={cn(
        "w-6 h-6 rounded flex items-center justify-center text-white transition-all duration-500",
        displayStatus === "pending" && "bg-yellow-500",
        displayStatus === "sent" && "bg-blue-500 animate-status-change",
        displayStatus === "opened" && "bg-green-500 animate-status-change",
        displayStatus === "failed" && "bg-red-500",
        className
      )}
    >
      {displayStatus === "sent" ? (
        <MailIcon className="h-4 w-4" />
      ) : displayStatus === "opened" ? (
        <MailOpenIcon className="h-4 w-4" />
      ) : displayStatus === "failed" ? (
        <XIcon className="h-4 w-4" />
      ) : (
        <ClockIcon className="h-4 w-4" />
      )}
    </div>
  );
}

// Add custom keyframes for status change animation
const statusChangeKeyframes = `
@keyframes status-change {
  0% { transform: scale(1); background-color: rgb(239, 68, 68); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); background-color: rgb(16, 185, 129); }
}

.animate-status-change {
  animation: status-change 0.6s ease-in-out forwards;
}
`;

// Add the keyframes to the document
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = statusChangeKeyframes;
  document.head.appendChild(style);
}
