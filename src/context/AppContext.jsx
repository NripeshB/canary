import React, { createContext, useReducer, useContext, useCallback } from 'react';

const AppContext = createContext(null);
const AppDispatchContext = createContext(null);

const initialState = {
  // Data from API
  geojson: null,
  wardList: [],         // summary list from /api/wards/
  wardDetail: null,     // full detail from /api/wards/<id>/
  hotspots: [],         // from /api/hotspots/
  cityTrend: [],        // from /api/city-trend/
  sourceMapData: [],    // from /api/city-source-map/
  reports: [],          // recent reports

  // Map state
  mapMode: 'aqi',       // 'aqi' | 'source' | 'combined'

  // Selection state
  selectedWard: null,
  selectedFeature: null,
  hoveredWard: null,

  // Panel state
  isPanelOpen: false,
  isLeftPanelOpen: false,
  isModalOpen: false,
  isDistrictListOpen: false,

  // Loading / Error
  isLoading: true,
  isDetailLoading: false,
  error: null,
  lastUpdated: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        geojson: action.payload.geojson,
        wardList: action.payload.wardList,
        hotspots: action.payload.hotspots,
        cityTrend: action.payload.cityTrend,
        sourceMapData: action.payload.sourceMapData,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_WARD_DETAIL':
      return {
        ...state,
        wardDetail: action.payload,
        isDetailLoading: false,
        isPanelOpen: true,
        isLeftPanelOpen: true,
      };

    case 'SET_DETAIL_LOADING':
      return { ...state, isDetailLoading: true };

    case 'SELECT_WARD':
      return {
        ...state,
        selectedWard: action.payload.wardNo,
        selectedFeature: action.payload.feature,
        isDetailLoading: true,
      };

    case 'DESELECT_WARD':
      return {
        ...state,
        selectedWard: null,
        selectedFeature: null,
        wardDetail: null,
        isPanelOpen: false,
        isLeftPanelOpen: false,
      };

    case 'HOVER_WARD':
      return { ...state, hoveredWard: action.payload };

    case 'SET_MAP_MODE':
      return { ...state, mapMode: action.payload };

    case 'TOGGLE_MODAL':
      return { ...state, isModalOpen: action.payload ?? !state.isModalOpen };

    case 'TOGGLE_DISTRICT_LIST':
      return { ...state, isDistrictListOpen: action.payload ?? !state.isDistrictListOpen };

    case 'ADD_REPORT':
      return {
        ...state,
        reports: [action.payload, ...state.reports],
      };

    case 'SET_REPORTS':
      return { ...state, reports: action.payload };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context;
}
