"""Write a "looks" note into every world dish (src/dishes/worldDishes.json).

Run: python3 scripts/world-looks.py

A looks note says what the dish must look like on the card, so the Kitchen can render it honestly
(the user, 2026-11-26: "World dishes must look like the real dish"):

  vessel   bowl, deep-bowl, kadai, ramekin, plate, board, glass or tart
  base     the colour and texture of what the food sits in (a gravy, a soup, a sauce, the rice, the
           drink) and the colour family the painting uses for it; `from` names the table
           ingredient that becomes the base (spinach in a palak gravy)
  pieces   the shape of each table ingredient on the plate (cube, slice, torn, whole...), and how
           far it sinks into the base
  finish   the signature finishing touch, in words
  never    what the dish must never show
  needs    features the renderer cannot paint yet (a boat of bread, a cracked caramel top, torn
           pancake pieces): a dish with any need is refused and a template dish cooks instead

Most notes are read from each dish's plating notes with simple word rules; the dishes the user
named, and others the rules get wrong, are written by hand in OVERRIDES.
"""
import json
import re
from pathlib import Path

PATH = Path(__file__).resolve().parent.parent / 'src' / 'dishes' / 'worldDishes.json'

# What the renderer cannot paint yet: a dish whose name or plating notes need one is refused.
UNSUPPORTED = [
    (r'\bboat', 'a boat of bread'),
    (r'brul[eé]e|cracked caramel|torched', 'a cracked caramel top in a ramekin'),
    (r'ramekin|souffl', 'a ramekin'),
    (r'kadai|karahi|wok', 'a kadai'),
    (r'\btorn\b.*pancake|schmarrn', 'torn pancake pieces'),
    (r'dumpling|wonton|gyoza|momo', 'dumplings'),
    (r'noodle|pasta|spaghetti|linguine|ramen|udon|pho\b', 'noodles'),
    (r'tortilla|taco|wrap\b|burrito|quesadilla|chilaquiles', 'tortillas'),
    (r'flatbread|pita|naan|injera|lavash|roti|paratha|crepe|blini', 'flatbread or crepes'),
    (r'sphere|arancini|croquette|fritter|kofta|meatball', 'fried balls'),
    (r'phyllo|filo|strudel|pie crust|pastry parcel|samosa|empanada|puff pastry', 'a pastry case'),
    (r'roll(ed|s)?\b(?!.*cabbage)', 'rolls'),
    (r'skewered nut|nut strand|churchkhela', 'candle-shaped nut strands'),
    (r'jelly|gelatin|panna cotta|flan\b|custard pot|pudding cup', 'a set custard or jelly'),
    (r'scrambled', 'scrambled egg'),
    (r'stuffed|filled (pepper|tomato)|mahshi', 'stuffed vegetables'),
    (r'gratin|crusted', 'a baked gratin crust'),
    (r'dough|bun\b|bao|pav\b|rolls', 'bread rolls or dough'),
    (r'jeon|latke|r[oö]sti|potato pancake|savou?ry pancake', 'a pan-fried cake'),
    (r'omelet|tamagoyaki|frittata|tortilla espa|egg wedge|herb-egg|kuku', 'an omelette'),
    (r'\bcake\b|cheesecake|sponge|clafoutis|cobbler|crumble\b|grunt', 'a baked cake or crumble'),
    (r'compote|jam\b|preserve', 'a compote'),
    (r'curd\b|paneer|tofu', 'fresh curd cheese'),
]

COLOURS = [
    (r'\b(emerald|jade|green|herb|basil|pesto|spinach|cilantro)\b', 'green'),
    (r'\b(coral|red|tomato|chili|crimson|ruby|paprika)\b', 'red'),
    (r'\b(blush|pink|rose)\b', 'pink'),
    (r'\b(purple|violet|plum|grape|blueberry|berry)\b', 'purple'),
    (r'\b(amber|caramel|honey|maple|toffee)\b', 'amber'),
    (r'\b(golden|yellow|saffron|turmeric)\b', 'golden'),
    (r'\b(orange|apricot|peach|mango|carrot)\b', 'orange'),
    (r'\b(brown|jus|gravy|soy|teriyaki|dark)\b', 'brown'),
    (r'\b(white|cream|creamy|ivory|pale|vanilla)\b', 'cream'),
]
# The words that name a base: the colour that counts is the one just before one of these.
BASE_NOUNS = r'rice|sauce|soup|broth|gravy|drink|smoothie|juice|shake|lassi|tea|cider|lemonade|cooler|spritz|puree|purée|pool|smear|oil|glaze|curry|stew|dressing|cream|custard'

FAMILY = {
    'drink': {'green': 'drink-green', 'red': 'drink-red', 'pink': 'drink-pink', 'purple': 'drink-purple', 'amber': 'drink-gold', 'golden': 'drink-gold', 'orange': 'drink-orange', 'brown': 'drink-gold', 'cream': 'cream'},
    'soup': {'green': 'green-gravy', 'red': 'soup-tomato', 'pink': 'soup-tomato', 'purple': 'berry-sauce', 'amber': 'soup-potato', 'golden': 'soup-potato', 'orange': 'drink-orange', 'brown': 'jus', 'cream': 'cream-sauce'},
    'pool': {'green': 'herb-oil', 'red': 'tomato-sauce', 'pink': 'berry-sauce', 'purple': 'berry-sauce', 'amber': 'caramel', 'golden': 'cheese-sauce', 'orange': 'chili-oil', 'brown': 'jus', 'cream': 'cream-sauce'},
    'rice': {'green': 'cooked-rice', 'red': 'rice-red', 'pink': 'rice-red', 'orange': 'rice-red', 'golden': 'rice-gold', 'amber': 'rice-gold', 'brown': 'rice-gold', 'cream': 'cooked-rice', 'purple': 'cooked-rice'},
}

# The shape words in plating notes, and the form each means.
SHAPES = [
    (r'cube|cubed|diced|chunks?', 'cube'),
    (r'wheels?|rings?|rounds', 'wheel'),
    (r'wedges?', 'wedge'),
    (r'halves|halved|half\b', 'half'),
    (r'torn|pulled|shredded|flaked', 'torn'),
    (r'strips?|ribbons?', 'strip'),
    (r'crumbl', 'crumble'),
    (r'fillet', 'fillet'),
    (r'drumstick', 'drumstick'),
    (r'skewer', 'skewer'),
    (r'sunny|fried egg|poached|soft egg|eggs? (nestled|on top|crowned)|topped with (soft )?egg', 'egg'),
    (r'mash', 'mash'),
    (r'fries|chips\b(?! garlic)', 'fries'),
    (r'leaves|wilted|nest of|greens', 'leaf'),
    (r'garlic chips|crisp garlic', 'chip'),
    (r'slice|sliced|fanned|shingled|carpaccio', 'slice'),
    (r'whole|heads|florets?|berries|cluster', 'whole'),
]

# The forms the renderer has for each ingredient (traits.ts forms plus the generic cuts).
GENERIC_CUTS = {'wheel', 'half', 'wedge', 'slice', 'cube'}
FORMS = {
    'steak': {'steak', 'slice', 'cube', 'skewer'}, 'salmon': {'fillet', 'slice', 'cube', 'skewer', 'torn'}, 'chicken': {'slice', 'drumstick', 'torn', 'skewer'},
    'eggs': {'egg', 'half', 'omelette'}, 'potato': {'mash', 'whole', 'fries', 'wedge', 'cube', 'wheel'}, 'rice': set(), 'baguette': {'toast', 'cube'},
    'broccoli': {'whole', 'half'}, 'apple': GENERIC_CUTS, 'pear': GENERIC_CUTS, 'peach': GENERIC_CUTS, 'orange': GENERIC_CUTS, 'lemon': GENERIC_CUTS,
    'lime': GENERIC_CUTS, 'strawberry': {'half', 'slice', 'whole'}, 'watermelon': {'cube', 'wedge', 'slice'}, 'tomato': {'wedge', 'half', 'wheel', 'cube'},
    'onion': {'wheel'}, 'pepper': {'strip', 'half', 'slice'}, 'avocado': {'slice', 'cube', 'smash'}, 'grapes': {'berry', 'half'}, 'blueberries': {'berry'},
    'mushroom': {'half', 'slice', 'whole'}, 'cabbage': {'leaf', 'wedge', 'roll'}, 'spinach': {'leaf'}, 'romaine': {'leaf'}, 'cheese': {'wedge', 'slice', 'crumble', 'cube'},
    'butter': {'cube', 'crumble'}, 'milk': set(), 'sauce': set(), 'garlic': {'chip'},
}
DEFAULT_SHAPE = {
    'steak': 'steak', 'salmon': 'fillet', 'chicken': 'slice', 'eggs': 'egg', 'potato': 'wedge', 'baguette': 'toast', 'broccoli': 'half', 'apple': 'slice',
    'pear': 'slice', 'peach': 'slice', 'orange': 'wheel', 'lemon': 'wheel', 'lime': 'wheel', 'strawberry': 'half', 'watermelon': 'cube', 'tomato': 'wedge',
    'onion': 'wheel', 'pepper': 'strip', 'avocado': 'slice', 'grapes': 'berry', 'blueberries': 'berry', 'mushroom': 'half', 'cabbage': 'leaf',
    'spinach': 'leaf', 'romaine': 'leaf', 'cheese': 'crumble', 'butter': 'cube', 'garlic': 'chip',
}
# Ingredients that are a base, not pieces, when the dish has one (milk in a drink, rice in a bowl).
BASE_ONLY = {'milk', 'sauce', 'rice'}
VESSEL = {'plate': 'plate', 'slate': 'plate', 'bowl': 'bowl', 'deep-bowl': 'deep-bowl', 'board': 'board', 'glass': 'glass', 'tart': 'tart'}

OVERRIDES = {
    'palak-paneer': {
        'vessel': 'deep-bowl',
        'base': {'colour': 'green', 'texture': 'smooth, fully green spinach gravy', 'family': 'green-gravy', 'from': 'spinach'},
        'pieces': [{'ingredient': 'cheese', 'shape': 'cube', 'sink': 'half'}],
        'finish': 'a swirl of cream',
        'never': ['chicken', 'a yellow sauce', 'cheese slices on a flat plate'],
        'needs': [],
    },
    'adjaruli-khachapuri': {
        'vessel': 'board',
        'base': {'colour': 'golden', 'texture': 'a boat of crisp bread holding molten cheese', 'family': 'cheese-sauce', 'from': 'cheese'},
        'pieces': [{'ingredient': 'eggs', 'shape': 'yolk', 'sink': 'half'}, {'ingredient': 'butter', 'shape': 'cube', 'sink': 'half'}],
        'finish': 'an egg yolk and a pat of butter in the middle of the cheese',
        'never': ['toast slices', 'a fried egg on a plate'],
        'needs': ['a boat of bread'],
    },
    'austrian-kaiserschmarrn': {
        'vessel': 'plate',
        'base': None,
        'pieces': [{'ingredient': 'milk', 'shape': 'torn pancake', 'sink': 'none'}],
        'finish': 'caramelised edges and a snow of icing sugar, fruit compote beside',
        'never': ['a neat pancake stack'],
        'needs': ['torn pancake pieces'],
    },
    'creme-brulee': {
        'vessel': 'ramekin',
        'base': {'colour': 'cream', 'texture': 'set vanilla custard', 'family': 'custard', 'from': 'eggs'},
        'pieces': [],
        'finish': 'a cracked, glassy caramel top',
        'never': ['ice cream on a plate'],
        'needs': ['a cracked caramel top in a ramekin'],
    },
    'persian-doogh': {
        'vessel': 'glass',
        'base': {'colour': 'cream', 'texture': 'thin, savoury yoghurt drink, lightly fizzy', 'family': 'cream', 'from': 'milk'},
        'pieces': [],
        'finish': 'torn mint leaves floating on top',
        'never': ['a vanilla milkshake', 'syrup'],
        'needs': [],
        'savoury': True,
    },
}


KIND_NOUNS = {
    'drink': r'drink|smoothie|juice|shake|lassi|tea|cider|lemonade|cooler|spritz|agua|soda|punch',
    'soup': r'soup|broth|puree|purée|gravy|curry|stew|bisque',
    'rice': r'rice',
    'pool': r'sauce|gravy|smear|pool|glaze|oil|jus|puree|purée|dressing',
}


def colour_of(text: str, kind: str | None = None) -> str | None:
    # The colour word nearest before the base's own noun ("coral-red tomato puree", "pale yogurt drink").
    for noun in re.finditer(KIND_NOUNS.get(kind or '', BASE_NOUNS), text):
        window = text[max(0, noun.start() - 45): noun.start()]
        found = [(m.start(), colour) for pattern, colour in COLOURS for m in re.finditer(pattern, window)]
        if found:
            return max(found)[1]
    for pattern, colour in COLOURS:
        if re.search(pattern, text):
            return colour
    return None


def base_of(dish: dict, text: str) -> dict | None:
    layout = dish['layout']
    # Read from the plating notes only (a dish's name, "teriyaki", must not tint its rice).
    text = dish['platingNotes'].lower()
    if layout == 'glass-drink':
        kind = 'drink'
        texture = 'a smooth drink' if not re.search(r'fizz|spritz|soda|sparkl', text) else 'a sparkling drink'
    elif layout == 'soup-bowl':
        kind = 'soup'
        texture = 'a smooth soup' if not re.search(r'broth|clear', text) else 'a clear broth'
    elif layout == 'rice-bowl':
        kind = 'rice'
        texture = 'mixed rice with herb and vegetable flecks'
    elif layout in ('tart', 'toast-board', 'pancake-stack', 'leaf-salad'):
        # The vehicle (pastry, toast, pancakes) is the base: any sauce is on top, not a pool.
        return None
    elif re.search(r'pool|sauce|gravy|smear|glaze|oil|jus|puree|purée|cream', text):
        kind = 'pool'
        texture = 'a glossy sauce pool'
    else:
        return None
    colour = 'brown' if kind == 'pool' and re.search(r'\bjus\b|gravy|soy|teriyaki', text) else colour_of(text, kind)
    # Rice is white unless the notes colour the rice itself ("vibrant red ... rice").
    if kind == 'rice' and not re.search(r'(red|golden|yellow|saffron|turmeric)[\w\s-]{0,30}rice', text):
        colour = 'cream'
    colour = colour or ('cream' if kind in ('rice', 'soup') else 'brown' if kind == 'pool' else 'golden')
    return {'colour': colour, 'texture': texture, 'family': FAMILY[kind][colour], 'kind': kind}


def shape_near(ingredient: str, text: str) -> str:
    # The shape word closest to the ingredient's name in the notes, else its default.
    words = {'eggs': r'eggs?', 'baguette': r'bread|toast|crouton', 'grapes': r'grapes?', 'blueberries': r'blueberr', 'potato': r'potato|fries|mash|hash', 'onion': r'onion|scallion|shallot'}
    name = words.get(ingredient, re.escape(ingredient.rstrip('s')))
    match = re.search(name, text)
    allowed = FORMS.get(ingredient, set())
    if match:
        window = text[max(0, match.start() - 40): match.end() + 40]
        for pattern, shape in SHAPES:
            if re.search(pattern, window):
                # (A sliced potato or a sliced steak is cut in wheels or carved: the forms we have.)
                shape = {('potato', 'slice'): 'wheel', ('steak', 'slice'): 'steak', ('baguette', 'slice'): 'toast'}.get((ingredient, shape), shape)
                if shape in allowed:
                    return shape
    shape = DEFAULT_SHAPE.get(ingredient, 'slice')
    return shape if shape in allowed or not allowed else sorted(allowed)[0]


def looks_of(dish: dict) -> dict:
    if dish['id'] in OVERRIDES:
        return OVERRIDES[dish['id']]
    text = (dish['name'] + ' ' + dish['platingNotes']).lower()
    needs = sorted({why for pattern, why in UNSUPPORTED if re.search(pattern, text)})
    base = base_of(dish, text)
    pieces = []
    for ingredient in dict.fromkeys(dish['heroes'] + [i for i in dish['coreIngredients'] if i in dish['heroes']]):
        if ingredient in BASE_ONLY:
            continue
        if base and base['kind'] == 'soup' and ingredient in ('potato', 'tomato', 'pepper', 'spinach') and ingredient in text[:80]:
            base['from'] = ingredient
            continue
        if ingredient == 'baguette' and dish['layout'] == 'toast-board':
            shape = 'toast'
        elif ingredient == 'potato' and dish['layout'] == 'mash-plate':
            shape = 'mash'
        elif ingredient == 'avocado' and re.search(r'smash|mashed avocado|guacamole', text):
            shape = 'smash'
        else:
            shape = shape_near(ingredient, text)
        sink = 'third' if dish['layout'] in ('soup-bowl', 'rice-bowl') else 'none'
        pieces.append({'ingredient': ingredient, 'shape': shape, 'sink': sink})
    vessel = VESSEL.get(dish['vessel'], 'plate')
    if dish['layout'] == 'skillet-bake':
        vessel = 'bowl'
    finish = ', '.join(dish['supportingComponents'][:2]) or 'a few fresh herbs'
    out = {'vessel': vessel, 'base': {k: v for k, v in base.items() if k != 'kind'} if base else None, 'pieces': pieces, 'finish': finish, 'never': [], 'needs': needs}
    if dish['taste'] == 'savoury':
        out['never'].append('syrup or sweet sauces')
    return out


def main() -> None:
    dishes = json.loads(PATH.read_text())
    for dish in dishes:
        dish['looks'] = looks_of(dish)
    PATH.write_text(json.dumps(dishes, ensure_ascii=False, indent=2) + '\n')
    refused = [d['id'] for d in dishes if d['looks']['needs']]
    print(f'{len(dishes)} dishes, {len(refused)} refused for now ({len(dishes) - len(refused)} renderable)')


if __name__ == '__main__':
    main()
