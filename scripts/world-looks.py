"""
Import the hand-authored looks notes (docs/forage-specs/world-dish-looks.json) into
src/dishes/worldDishes.json as each dish's `looks`, in the shape the renderer reads.

The notes replace the old regex guesses. What the renderer cannot paint honestly yet (a vessel it
has no mesh for, a non-pantry ingredient, a form the kit cannot build, a melted cheese cap, and the
dishes the notes' README lists as refused) lands in `needs`, and a dish with needs is refused.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / 'src' / 'dishes' / 'worldDishes.json'
NOTES = ROOT / 'docs' / 'forage-specs' / 'world-dish-looks.json'

# README section 3: refused until the missing ingredient, geometry or vessel exists.
REFUSED = {
    'ca-phe-trung', 'duck-a-lorange', 'aloo-gobi', 'broccoli-orecchiette', 'broccoli-aglio-olio', 'cacio-e-pepe',
    'vietnamese-pho-ga', 'egyptian-koshari', 'sichuan-chili-wontons', 'georgian-churchkhela', 'adjaruli-khachapuri',
    'creme-brulee', 'austrian-kaiserschmarrn', 'crepes-suzette', 'egyptian-hawawshi', 'aloo-paratha', 'mumbai-pav-bhaji',
    'ichigo-sando', 'schiacciata-uva', 'chicken-pastilla', 'greek-spanakopita', 'om-ali', 'chilaquiles', 'huevos-rancheros',
    'british-eton-mess', 'peach-cobbler', 'blueberry-grunt', 'okonomiyaki', 'gamja-jeon', 'bubble-and-squeak',
    'batates-mahshia', 'sicilian-arancini', 'indian-rasmalai', 'chawanmushi', 'broccoli-chawanmushi', 'gyeran-jjim',
    'tamagoyaki', 'tortilla-espanola', 'kuku-sabzi', 'steak-tartare',
}
PANTRY = {
    'steak', 'salmon', 'chicken', 'eggs', 'potato', 'rice', 'baguette', 'broccoli', 'apple', 'pear', 'peach', 'orange',
    'lemon', 'lime', 'strawberry', 'watermelon', 'tomato', 'onion', 'pepper', 'avocado', 'grapes', 'blueberries',
    'mushroom', 'cabbage', 'spinach', 'romaine', 'cheese', 'butter', 'milk', 'sauce', 'garlic',
}
# Non-pantry pieces the kit paints from staples (a cream quenelle, milk pancakes).
STAPLE_PIECES = {'quenelle', 'whipped cream', 'pancake'}
VESSEL = {'plate': 'plate', 'shallow bowl': 'bowl', 'bowl': 'bowl', 'deep bowl': 'deep-bowl', 'board': 'board', 'glass': 'glass', 'tart': 'tart'}

COLOURS = [
    (r'\b(emerald|jade|green|herb|basil|pesto|spinach|cilantro)\b', 'green'),
    (r'\b(coral|red|tomato|chili|crimson|ruby|paprika|brick)\b', 'red'),
    (r'\b(blush|pink|rose)\b', 'pink'),
    (r'\b(purple|violet|plum|grape|blueberry|berry)\b', 'purple'),
    (r'\b(amber|caramel|honey|maple|toffee)\b', 'amber'),
    (r'\b(golden|yellow|saffron|turmeric)\b', 'golden'),
    (r'\b(orange|apricot|peach|mango|carrot)\b', 'orange'),
    (r'\b(brown|jus|gravy|soy|teriyaki|dark)\b', 'brown'),
    (r'\b(white|cream|creamy|ivory|pale|vanilla|clear)\b', 'cream'),
]
FAMILY = {
    'drink': {'green': 'drink-green', 'red': 'drink-red', 'pink': 'drink-pink', 'purple': 'drink-purple', 'amber': 'drink-gold', 'golden': 'drink-gold', 'orange': 'drink-orange', 'brown': 'drink-gold', 'cream': 'cream'},
    'soup': {'green': 'green-gravy', 'red': 'soup-tomato', 'pink': 'soup-tomato', 'purple': 'berry-sauce', 'amber': 'soup-potato', 'golden': 'soup-potato', 'orange': 'drink-orange', 'brown': 'jus', 'cream': 'cream-sauce'},
    'pool': {'green': 'herb-oil', 'red': 'tomato-sauce', 'pink': 'berry-sauce', 'purple': 'berry-sauce', 'amber': 'caramel', 'golden': 'cheese-sauce', 'orange': 'chili-oil', 'brown': 'jus', 'cream': 'cream-sauce'},
    # A set or simmered pudding filling its bowl (Muhallabieh, kheer, sutlac): never scoops of ice cream.
    'pudding': {'green': 'cream', 'red': 'berry-sauce', 'pink': 'berry-sauce', 'purple': 'berry-sauce', 'amber': 'custard', 'golden': 'custard', 'orange': 'custard', 'brown': 'custard', 'cream': 'cream'},
    'rice': {'green': 'cooked-rice', 'red': 'rice-red', 'pink': 'rice-red', 'orange': 'rice-red', 'golden': 'rice-gold', 'amber': 'rice-gold', 'brown': 'rice-gold', 'cream': 'cooked-rice', 'purple': 'cooked-rice'},
}
SHAPES = [
    (r'quenelle|dollop', 'quenelle'),
    (r'mash', 'mash'),
    (r'smash', 'smash'),
    (r'fries', 'fries'),
    (r'drumstick', 'drumstick'),
    (r'skewer', 'skewer'),
    (r'fillet', 'fillet'),
    (r'ribbon', 'ribbon'),
    (r'flake', 'flake'),
    (r'toast', 'toast'),
    (r'omelette', 'omelette'),
    (r'yolk|poached|fried egg|egg\b', 'egg'),
    (r'pat', 'cube'),
    (r'cube|dice|chunk|bites', 'cube'),
    (r'wheel|ring|round', 'wheel'),
    (r'wedge', 'wedge'),
    (r'halves|halved|half', 'half'),
    (r'torn|shred|pulled', 'torn'),
    (r'\broll', 'roll'),
    (r'strip|segment', 'strip'),
    (r'crumbl', 'crumble'),
    (r'chip|shaving', 'chip'),
    (r'leaf|leaves|wilted', 'leaf'),
    (r'slice|sliced|fanned', 'slice'),
    (r'whole|floret|berr|grain|cluster|mound', 'whole'),
]
GENERIC_CUTS = {'wheel', 'half', 'wedge', 'slice', 'cube'}
FORMS = {
    'steak': {'steak', 'slice', 'cube', 'skewer'}, 'salmon': {'fillet', 'slice', 'cube', 'skewer', 'torn', 'ribbon', 'flake'},
    'chicken': {'slice', 'drumstick', 'torn', 'skewer'}, 'eggs': {'egg', 'half', 'omelette'},
    'potato': {'mash', 'whole', 'fries', 'wedge', 'cube', 'wheel'}, 'baguette': {'toast', 'cube'},
    'broccoli': {'whole', 'half'}, 'apple': GENERIC_CUTS, 'pear': GENERIC_CUTS, 'peach': GENERIC_CUTS, 'orange': GENERIC_CUTS,
    'lemon': GENERIC_CUTS, 'lime': GENERIC_CUTS, 'strawberry': {'half', 'slice', 'whole'}, 'watermelon': {'cube', 'wedge', 'slice'},
    'tomato': {'wedge', 'half', 'wheel', 'cube'}, 'onion': {'wheel'}, 'pepper': {'strip', 'half', 'slice'},
    'avocado': {'slice', 'cube', 'smash'}, 'grapes': {'berry', 'half'}, 'blueberries': {'berry'}, 'mushroom': {'half', 'slice', 'whole'},
    'cabbage': {'leaf', 'wedge', 'roll'}, 'spinach': {'leaf'}, 'romaine': {'leaf'}, 'cheese': {'wedge', 'slice', 'crumble', 'cube'},
    'butter': {'cube', 'crumble'}, 'garlic': {'chip'},
}
# A shape word the kit has under another name for this ingredient.
ALIAS = {
    ('broccoli', 'whole'): 'half', ('grapes', 'whole'): 'berry', ('blueberries', 'whole'): 'berry', ('steak', 'slice'): 'steak',
    ('potato', 'slice'): 'wheel', ('onion', 'slice'): 'wheel', ('baguette', 'slice'): 'toast', ('strawberry', 'cube'): 'half',
    ('cheese', 'chip'): 'crumble', ('cheese', 'torn'): 'crumble', ('chicken', 'strip'): 'slice', ('chicken', 'cube'): 'torn',
    ('chicken', 'whole'): 'drumstick', ('spinach', 'whole'): 'leaf', ('steak', 'strip'): 'slice', ('salmon', 'strip'): 'slice',
    ('mushroom', 'cube'): 'half', ('pepper', 'wheel'): 'slice', ('pepper', 'cube'): 'strip', ('avocado', 'half'): 'slice',
    ('avocado', 'wedge'): 'slice', ('tomato', 'whole'): 'half', ('tomato', 'slice'): 'wheel', ('apple', 'whole'): 'half',
    ('butter', 'slice'): 'cube', ('garlic', 'slice'): 'chip', ('cabbage', 'strip'): 'leaf', ('cabbage', 'torn'): 'leaf', ('cabbage', 'ribbon'): 'leaf', ('spinach', 'torn'): 'leaf', ('spinach', 'ribbon'): 'leaf',
}
BASE_ONLY = {'milk', 'sauce', 'rice'}
KIND = {'glass-drink': 'drink', 'soup-bowl': 'soup', 'rice-bowl': 'rice'}
NO_BASE = {'tart', 'toast-board', 'pancake-stack', 'leaf-salad'}
MEAT = ['steak', 'chicken']


def colour_of(text: str) -> str | None:
    found = [(m.start(), colour) for pattern, colour in COLOURS for m in re.finditer(pattern, text)]
    return min(found)[1] if found else None


def form_of(ingredient: str, shape: str, layout: str) -> str | None:
    if ingredient == 'baguette':
        return 'toast' if layout == 'toast-board' else 'cube'
    allowed = FORMS.get(ingredient, set())
    for pattern, form in SHAPES:
        if re.search(pattern, shape):
            form = ALIAS.get((ingredient, form), form)
            if form in allowed:
                return form
    return None


def looks_of(dish: dict, note: dict) -> dict:
    layout = dish['layout']
    needs: list[str] = []
    if note['id'] in REFUSED:
        needs.append('a form the kit cannot build yet')
    vessel = note['vessel']
    claim = ' '.join(note['minimum_to_claim_name']).lower()
    if vessel in ('skillet', 'kadai'):
        # A skillet or kadai is painted as a bowl only when the note's claim does not need the pan itself.
        if re.search(rf'(?<!or ){vessel}', claim) and not re.search(rf'bowl or {vessel}|{vessel} or bowl', claim):
            needs.append(f'a {vessel}')
        vessel = 'deep-bowl' if vessel == 'kadai' or layout in ('rice-bowl', 'soup-bowl') else 'bowl'
    elif vessel in VESSEL:
        vessel = VESSEL[vessel]
    else:
        needs.append(f'a {vessel}')
        vessel = 'bowl'
    if re.search(r'melt|molten|gratin|bubbl|broil', claim) and re.search(r'cheese|cheddar|gruy|raclette|reblochon|queso', claim):
        needs.append('a melted cheese cap')

    base = None
    lead = None
    if note['base'] and layout not in NO_BASE:
        text = (note['base']['colour'] + ' ' + note['base']['texture']).lower()
        kind = KIND.get(layout) or ('pudding' if layout == 'dessert-bowl' and re.search(r'pudding|set milk|kheer', text) else 'soup' if re.search(r'gravy|curry|stew|soup|broth|puree|purée|dal', text) else 'pool')
        if kind == 'pool' and re.search(r'smash|mash|dome', text):
            # A smashed avocado or mash "base" is the hero piece itself, not a pool.
            lead = next((i for i in ('avocado', 'potato') if i in text or (i == 'potato' and 'mash' in text)), None)
        elif kind == 'pool' and not re.search(r'sauce|gravy|pool|puree|purée|smear|yog|cream|jus|glaze|labneh|hummus|tahini|custard|compote|coulis', text):
            pass  # oil dots, a drizzle or a dusting: a garnish, not a base
        else:
            colour = colour_of(note['base']['colour'].lower()) or colour_of(text) or ('cream' if kind in ('rice', 'soup', 'drink') else 'brown')
            if kind == 'rice' and not re.search(r'red|golden|yellow|saffron|turmeric|orange|brown', note['base']['colour'].lower()):
                colour = 'cream'
            family = FAMILY[kind][colour]
            # A sweet dish's red pool is a berry coulis, never tomato sauce.
            if (dish['course'] == 'dessert' or dish['taste'] == 'sweet') and family in ('tomato-sauce', 'chili-oil'):
                family = 'berry-sauce'
            base = {'colour': colour, 'texture': note['base']['texture'], 'family': family}
            # The table ingredient the base is made of (spinach in a palak gravy) goes into it.
            makers = ('spinach', 'tomato', 'potato', 'pepper') if kind == 'soup' else ('milk', 'rice', 'grapes') if kind == 'pudding' else \
                ('milk',) if kind == 'drink' else ()
            for ingredient in dish['heroes'] + dish['coreIngredients']:
                if ingredient in makers and re.search(ingredient.rstrip('s')[:6], text):
                    base['from'] = ingredient
                    break

    pieces = []
    if lead:
        pieces.append({'ingredient': lead, 'shape': 'smash' if lead == 'avocado' else 'mash', 'sink': 'none', 'size_cm': 8.0 if lead == 'avocado' else 10.0})
    for piece in note['pieces']:
        ingredient = piece['ingredient']
        if ingredient not in PANTRY:
            if ingredient not in STAPLE_PIECES:
                needs.append(ingredient)
            continue
        # (Milk set into a dome, a panna cotta, is a piece: the kit's cream mound.)
        if ingredient == 'milk' and re.search(r'dome|mound|unmold', piece['shape'] + ' ' + piece['placement']):
            pieces.append({'ingredient': 'milk', 'shape': 'mash', 'sink': 'none', 'size_cm': piece['size_cm'], 'required': True})
            continue
        if ingredient in BASE_ONLY or (base and base.get('from') == ingredient and kind == 'soup') or ingredient == lead:
            continue
        form = form_of(ingredient, piece['shape'].lower(), layout)
        if form is None:
            # Only a hero has to look exactly right; an accent the kit cannot cut keeps its default.
            if ingredient in dish['heroes'][:1]:
                needs.append(f'{ingredient} as {piece["shape"]}')
            continue
        place = piece['placement'].lower()
        sink = 'half' if 'half' in place and 'sunk' in place else 'third' if 'sunk' in place or 'nestled' in place or layout in ('soup-bowl', 'rice-bowl') else 'none'
        if any(p['ingredient'] == ingredient for p in pieces):
            continue
        # A piece the note shows only "if on table" (or as optional) is not needed to claim the name.
        required = not re.search(r'if on table|if garnish|optional', place)
        pieces.append({'ingredient': ingredient, 'shape': form, 'sink': sink, 'size_cm': piece['size_cm'], 'required': required})

    never = list(note['never'])
    # Ingredient words the note forbids outright, as pantry ids (a "no meat" claim forbids steak and chicken).
    for word in note['never'] + note['minimum_to_claim_name']:
        w = word.lower().strip()
        if re.fullmatch(r'(no |any )?meat', w):
            never += MEAT
    # Ice cream only where the note serves it (R7: Muhallabieh came as two scoops of "ice cream").
    scoop = bool(re.search(r'quenelle|ice cream|gelato|sorbet|scoop', json.dumps(note).lower()))
    whip = bool(re.search(r'whip|chantilly|cream (dollop|cloud|cap|swirl)|foam|froth', json.dumps(note).lower()))
    out = {'vessel': vessel, 'base': base, 'pieces': pieces, 'finish': note['finish'], 'never': never, 'scoop': scoop, 'whip': whip,
           'needs': sorted(set(needs)), 'claim': note['minimum_to_claim_name']}
    if dish['taste'] == 'savoury':
        out['savoury'] = True
    return out


def main() -> None:
    dishes = json.loads(PATH.read_text())
    notes = {n['id']: n for n in json.loads(NOTES.read_text())}
    for dish in dishes:
        dish['looks'] = looks_of(dish, notes[dish['id']])
    PATH.write_text(json.dumps(dishes, ensure_ascii=False, indent=2) + '\n')
    refused = [d['id'] for d in dishes if d['looks']['needs']]
    print(f'{len(dishes)} dishes, {len(refused)} refused for now ({len(dishes) - len(refused)} renderable)')
    extra = sorted(set(refused) - REFUSED)
    print('refused beyond the README list:', ', '.join(f"{i} ({notes[i]['vessel']}: {[d for d in dishes if d['id']==i][0]['looks']['needs']})" for i in extra))


if __name__ == '__main__':
    main()
