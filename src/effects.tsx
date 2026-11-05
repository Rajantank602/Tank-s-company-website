import { Fragment } from 'react';
import type { CSSProperties } from 'react';

// Small decorative text and ambient effects. Every one keeps its real text in the DOM as plain
// text, so headings, numbers and copy read normally to screen readers and search engines.

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

// A heading whose words drift up out of a soft blur, one after another, when its [data-reveal]
// section scrolls in. `*word*` marks an emphasised word; '\n' is a line break.
export function SplitWords({ text }: { text: string }) {
  let index = 0;
  return (
    <>
      {text.split('\n').map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <>{' '}<br /></>}
          {line.split(' ').map((word, wordIndex) => {
            const emphasised = word.match(/^\*(.+)\*(.*)$/);
            return (
              <Fragment key={wordIndex}>
                {wordIndex > 0 && ' '}
                <span className="split-word" style={cssVars({ '--w': index++ })}>
                  {emphasised ? <><em>{emphasised[1]}</em>{emphasised[2]}</> : word}
                </span>
              </Fragment>
            );
          })}
        </Fragment>
      ))}
    </>
  );
}

// Types a line out letter by letter after `delay` ms. A caret rides along the newest letter,
// then blinks a few times at the end of the line and goes.
export function TypeIn({ text, delay }: { text: string; delay: number }) {
  return (
    <span className="type-in" style={cssVars({ '--type-delay': `${delay}ms`, '--type-count': text.length })}>
      {[...text].map((char, index) => (
        <span className="type-in__char" style={cssVars({ '--c': index })} key={index}>{char}</span>
      ))}
      <span className="type-in__caret" aria-hidden="true" />
    </span>
  );
}

// Digits roll up into place like a mechanical counter when their [data-reveal] section
// scrolls in. The digit itself stays as text; CSS draws the rolling 0–9 strip over it.
export function RollingNumber({ value }: { value: string }) {
  return (
    <span className="odometer">
      {[...value].map((char, index) => (/\d/.test(char)
        ? <span className="odometer__digit" style={cssVars({ '--d': Number(char), '--i': index })} key={index}>{char}</span>
        : <span key={index}>{char}</span>))}
    </span>
  );
}

// A word whose letters drop into place one by one as the page opens.
export function DropLetters({ text }: { text: string }) {
  return (
    <>
      {[...text].map((char, index) => (
        <span className="drop-letter" style={cssVars({ '--l': index })} key={index}>{char}</span>
      ))}
    </>
  );
}

// Foam bubbles drifting slowly upwards behind a section. Positions and timings live in CSS.
export function Bubbles({ className }: { className: string }) {
  return (
    <span className={`bubbles ${className}`} aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><i /><i />
    </span>
  );
}
