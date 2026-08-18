# Layout Contract

## Input to `PFLayout.generate(job)`

```json
{
  "items": [
    {
      "id": "3x4|abcd",
      "label": "3x4",
      "width": 30,
      "height": 40,
      "quantity": 4,
      "sourceId": "photo-...",
      "sourcePath": "C:/.../photo.jpg"
    }
  ],
  "media": {
    "type": "A4",
    "orientation": "portrait",
    "margin": 5,
    "gap": 0
  },
  "options": {
    "offsetBorder": 1.5,
    "rotateMode": "auto",
    "cutGuide": false,
    "grouping": "flat",
    "artboards": true
  }
}
```

## Output

A layout result contains `media`, `sheets`, `totalSlots`, `placed`, `unplaced`, `efficiency`, and `options`. Each slot includes coordinates in millimeters, physical dimensions, rotation, crop defaults, source metadata, and border offset.

## Units

Layout coordinates and sizes are expressed in **millimeters**. Illustrator host converts these values to points using its `MM` conversion.
