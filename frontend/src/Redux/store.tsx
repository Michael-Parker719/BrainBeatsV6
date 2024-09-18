import { configureStore } from '@reduxjs/toolkit'
import musicGenerationSettingsSlice from './slices/musicGenerationSettingsSlice'
import imageSlice from './slices/imageSlice'
import cardArraySlice from './slices/cardArraySlice'
import deviceSlice from './slices/deviceSlice'
import currentMidiSlice from './slices/currentMidiSlice'
import scriptIDSlice from './slices/scriptIDSlice'

export const store = configureStore({
  reducer: {musicGenerationSettingsSlice, imageSlice, cardArraySlice, deviceSlice, currentMidiSlice, scriptIDSlice},
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
