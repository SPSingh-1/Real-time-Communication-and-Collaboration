import { useContext } from "react";
import { AppContext } from "./AppProvider";

const useAppContext = () => useContext(AppContext);
export default useAppContext;
