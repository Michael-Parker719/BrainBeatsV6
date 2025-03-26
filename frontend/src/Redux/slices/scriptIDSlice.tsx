import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Card } from '../../util/Interfaces'
import type { RootState } from '../store'

const initialState = "";

export const scriptIDSlice = createSlice({
    name: 'scriptIDSlice',
    initialState,
    reducers: {
      setScriptIDGlobal: (state, action: PayloadAction<string>) => {
        // Directly update the state value (no reassignment)
        return action.payload; // Correct way to set the state value
      },
      unsetScriptIDGlobal: () => {
        return initialState; // Reset the state to its initial value
      }
    },
  });
  



export const { setScriptIDGlobal, unsetScriptIDGlobal} = scriptIDSlice.actions

export const getSlice = (state: RootState) => state.scriptIDSlice;

export default scriptIDSlice.reducer
