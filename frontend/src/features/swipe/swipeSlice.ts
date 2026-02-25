import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SwipeCard, SwipeState } from "./types";

const initialState: SwipeState = {
  deck: [],
  liked: [],
  disliked: [],
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
      state.matchedCard = card;
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
      state.matchedCard = null;
    },
  },
});

export const { setDeck, swipeRight, swipeLeft, clearMatch, resetDeck } = swipeSlice.actions;
export default swipeSlice.reducer;
