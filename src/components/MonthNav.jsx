import { useState } from 'react';
import { monthLabel } from '../lib/utils';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthNav({ curMk, months, onShift, onJump }) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(+curMk.split('-')[0]);
  const [cy, cm] = curMk.split('-').map(Number);

  function openPicker() {
    setPickerYear(+curMk.split('-')[0]);
    setOpen(true);
  }

  function jump(mk) {
    onJump(mk);
    setOpen(false);
  }

  return (
    <div className="relative mb-4">
      <div className="flex items-center gap-2 mb-1">
        <button className="btn-icon" onClick={() => onShift(-1)}><i className="fa fa-chevron-left" /></button>
        <button className="font-bold text-base px-2 cursor-pointer" onClick={openPicker}>{monthLabel(curMk)}</button>
        <button className="btn-icon" onClick={() => onShift(1)}><i className="fa fa-chevron-right" /></button>
        <span className="text-xs text-text3 ml-1 hidden sm:inline">Click month to jump</span>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full left-0 mt-1 card w-64">
            <div className="flex items-center justify-between mb-3">
              <button className="btn-icon" onClick={() => setPickerYear((y) => y - 1)}><i className="fa fa-chevron-left" /></button>
              <span className="font-bold text-sm">{pickerYear}</span>
              <button className="btn-icon" onClick={() => setPickerYear((y) => y + 1)}><i className="fa fa-chevron-right" /></button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((n, i) => {
                const mk = `${pickerYear}-${String(i + 1).padStart(2, '0')}`;
                const active = pickerYear === cy && i + 1 === cm;
                const hasData = !!months[mk];
                return (
                  <button
                    key={n}
                    onClick={() => jump(mk)}
                    className={`py-2 rounded-s text-xs font-semibold border transition-colors ${
                      active ? 'bg-blue text-white border-blue' : hasData ? 'border-blue/40 text-blue' : 'border-border text-text2 hover:bg-bg3'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
