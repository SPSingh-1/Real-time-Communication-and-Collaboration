// src/context/useAppContext.js
import { useContext } from 'react';
import { AppContext } from './AppProvider';

const useAppContext = () => {
  return useContext(AppContext);
};

export default useAppContext;
