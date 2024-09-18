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
            // Clear the state before we add to it again
            // state = initialState;
            state = action.payload;
        },
        unsetScriptIDGlobal: (state) => {
            state = initialState;
        }
    },
})



export const { setScriptIDGlobal, unsetScriptIDGlobal} = scriptIDSlice.actions

export const getSlice = (state: RootState) => state.scriptIDSlice;

export default scriptIDSlice.reducer
