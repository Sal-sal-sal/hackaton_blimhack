import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SwipeCard, SwipeState } from "./types";

const initialState: SwipeState = {
  deck: [],
  liked: [],
  disliked: [],
  likedCards: [],
  matchedCard: null,
};

const swipeSlice = createSlice({
  name: "swipe",
  initialState,
  reducers: {
    setDeck(state, action: PayloadAction<SwipeCard[]>) {
      state.deck = action.payload;
    },

    swipeRight(state) {
      const card = state.deck[state.deck.length - 1];
      if (!card) return;
      state.liked.push(card.id);
      state.likedCards.push(card);
      state.deck = state.deck.slice(0, -1);
    },

    swipeLeft(state) {
      const card = state.deck[state.deck.length - 1];
      if (!card) return;
      state.disliked.push(card.id);
      state.deck = state.deck.slice(0, -1);
    },

    clearMatch(state) {
      state.matchedCard = null;
    },

    resetDeck(state, action: PayloadAction<SwipeCard[]>) {
      state.deck = action.payload;
      state.liked = [];
      state.disliked = [];
      state.likedCards = [];
      state.matchedCard = null;
    },

    /** Update a card's fields in-place (e.g. after lazy-fetching full description) */
    updateCard(state, action: PayloadAction<{ id: string | number; changes: Partial<SwipeCard> }>) {
      const idx = state.deck.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) {
        state.deck[idx] = { ...state.deck[idx], ...action.payload.changes };
      }
    },
  },
});

export const { setDeck, swipeRight, swipeLeft, clearMatch, resetDeck, updateCard } = swipeSlice.actions;
export default swipeSlice.reducer;
