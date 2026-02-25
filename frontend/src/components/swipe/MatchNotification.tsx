import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearMatch } from "@/features/swipe/swipeSlice";
import { Button } from "@/components/ui/button";

/**
 * Full-screen overlay shown after a right swipe (application sent).
 * Lets the user continue swiping or jump to chat.
 */
export function MatchNotification() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const matchedCard = useAppSelector((s) => s.swipe.matchedCard);

  if (!matchedCard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-3xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl">
        {/* Confetti emoji */}
        <div className="text-6xl mb-4 animate-bounce">🎉</div>

        <h2 className="text-2xl font-black mb-1">Отклик отправлен!</h2>
        <p className="text-sm text-muted-foreground mb-2">Вы откликнулись на вакансию</p>
        <p className="font-semibold text-primary mb-8 text-lg">{matchedCard.title}</p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => dispatch(clearMatch())}
          >
            Продолжить
          </Button>

          <Button
            className="flex-1 gap-2"
            onClick={() => {
              dispatch(clearMatch());
              navigate("/chat");
            }}
          >
            <MessageSquare className="h-4 w-4" />
            К чату
          </Button>
        </div>
      </div>
    </div>
  );
}
