import { useState } from 'react';

const useInput = (initialValue) => {
  const [value, setValue] = useState(initialValue)
  return {
    value,
    setValue,
    bind: {
      onChange(e) {
        setValue(e.target.value);
      },
      value,
    },
    reset() {
      setValue(initialValue);
    },
  }
}

export default useInput;