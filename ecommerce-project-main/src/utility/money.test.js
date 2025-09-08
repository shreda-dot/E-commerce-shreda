import {it, expect, describe} from 'vitest'
import { FormatMoney } from './money'

describe ('formatMoney', () =>{
    it('format 1999 cents as $19.99',() =>{
expect(FormatMoney(1999)).toBe('$19.99');
});

it('displays 2 decimals', ()=>{
expect (FormatMoney(1090)).toBe('$10.90');
expect (FormatMoney(100)).toBe('$1.00')
});
} )

