import React, { useState } from "react";

export function Kalkulator() {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");

  const handlePress = (val: string) => {
    if (val === "C") {
      setDisplay("0");
      setEquation("");
      return;
    }
    
    if (val === "=") {
      if (!equation) return;
      try {
        const safeEq = equation.replace(/x/g, "*").replace(/÷/g, "/");
        const result = new Function("return " + safeEq)();
        let resStr = "0";
        if (result === Infinity || Number.isNaN(result)) {
           resStr = "Error";
        } else {
           resStr = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(5)).toString();
        }
        setDisplay(resStr);
        setEquation(resStr === "Error" ? "" : resStr);
      } catch (e) {
        setDisplay("Error");
        setEquation("");
      }
      return;
    }

    if (val === "DEL") {
      if (display === "Error") {
        setDisplay("0");
        setEquation("");
        return;
      }
      if (equation.length > 0) {
        const newEq = equation.slice(0, -1);
        setEquation(newEq);
        setDisplay(newEq || "0");
      }
      return;
    }

    // prevent starting with multiple zeroes or operator at start
    if (display === "Error" || (equation === "0" && val !== "." && !["+","-","x","÷"].includes(val))) {
      setEquation(val);
      setDisplay(val);
      return;
    }

    const newEq = equation + val;
    setEquation(newEq);
    setDisplay(newEq);
  };

  const btnClass = "bg-[#FAF9F6] border border-[#DCD9CC] rounded-xl p-4 text-center font-semibold text-[#4A4A40] text-lg hover:bg-white active:bg-[#E8E6DB] transition-colors cursor-pointer";
  const oprClass = "bg-[#007a07]/10 border border-[#007a07]/20 rounded-xl p-4 text-center font-bold text-[#007a07] text-lg hover:bg-[#007a07]/20 active:bg-[#007a07]/30 transition-colors cursor-pointer";

  return (
    <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm w-full max-w-sm mx-auto mt-4">
      <div className="text-sm md:text-base font-semibold mb-4 text-[#4A4A40]">Kalkulator</div>
      
      <div className="bg-[#E8E6DB] p-4 rounded-xl mb-4 text-right overflow-hidden break-all min-h-[80px] flex flex-col justify-end">
        <div className="text-[28px] font-bold text-[#4A4A40] leading-none mb-1">{display || "0"}</div>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-3">
        <button onClick={() => handlePress("C")} className={`${oprClass} col-span-2 text-[#B18B5E]`}>C</button>
        <button onClick={() => handlePress("DEL")} className={oprClass}>DEL</button>
        <button onClick={() => handlePress("÷")} className={oprClass}>÷</button>

        <button onClick={() => handlePress("7")} className={btnClass}>7</button>
        <button onClick={() => handlePress("8")} className={btnClass}>8</button>
        <button onClick={() => handlePress("9")} className={btnClass}>9</button>
        <button onClick={() => handlePress("x")} className={oprClass}>x</button>

        <button onClick={() => handlePress("4")} className={btnClass}>4</button>
        <button onClick={() => handlePress("5")} className={btnClass}>5</button>
        <button onClick={() => handlePress("6")} className={btnClass}>6</button>
        <button onClick={() => handlePress("-")} className={oprClass}>-</button>

        <button onClick={() => handlePress("1")} className={btnClass}>1</button>
        <button onClick={() => handlePress("2")} className={btnClass}>2</button>
        <button onClick={() => handlePress("3")} className={btnClass}>3</button>
        <button onClick={() => handlePress("+")} className={oprClass}>+</button>

        <button onClick={() => handlePress("0")} className={`${btnClass} col-span-2`}>0</button>
        <button onClick={() => handlePress(".")} className={btnClass}>.</button>
        <button onClick={() => handlePress("=")} className="bg-[#007a07] rounded-xl p-4 text-center font-bold text-white text-lg hover:bg-[#006606] transition-colors cursor-pointer">=</button>
      </div>
    </div>
  );
}
