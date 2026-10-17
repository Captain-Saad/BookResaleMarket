import { useEffect } from "react";

const useLogError = (error: Error) => {
  useEffect(() => {
    console.error(error);
  }, [error]);
};

export default useLogError;
