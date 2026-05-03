# Redim Windows

`redim-frame` is an Angular 16 library that provides resizable, draggable, and non-blocking floating windows using Bootstrap 5 styles. It leverages `@angular/cdk` for drag-and-drop functionality and dynamic content loading.

## Features

- **Responsive Viewport Units**: Uses `vw` and `vh` for all dimensions and positioning, ensuring windows scale with the browser.
- **Configurable**: Customize resize handles thickness and minimum dimensions.
- **Draggable Windows**: Move windows anywhere on the screen.
- **Resizable**: Resize windows from edges and corners.
- **Non-blocking**: Windows do not block interaction with the rest of the page.
- **Multiple Windows**: Open multiple instances simultaneously with z-index management.
- **Dynamic Content**: Load any Angular component or template into a window.
- **CSS Variables**: Automatically injects `--window-width` and `--window-height` CSS variables for responsive content.
- **Bootstrap Styled**: Built with Bootstrap 5 classes.

## Installation

1.  Install the library and dependencies:

    ```bash
    npm install redim-windows bootstrap @angular/cdk
    ```

2.  Add Bootstrap CSS to your `angular.json` or `styles.scss`:

    ```json
    "styles": [
      "node_modules/bootstrap/dist/css/bootstrap.min.css",
      "src/styles.css"
    ]
    ```

## Setup

Import `RedimWindowsModule` in your application module:

```typescript
import { RedimWindowsModule } from 'redim-windows';

@NgModule({
  imports: [
    RedimWindowsModule,
    // ...
  ],
  // ...
})
export class AppModule { }
```

## Usage

Inject `RedimFrameService` to open windows dynamically.

```typescript
import { Component } from '@angular/core';
import { RedimFrameService } from 'redim-windows';
import { MyComponent } from './my-component/my-component.component';

@Component({ ... })
export class AppComponent {
  constructor(private windowService: RedimFrameService) {}

  openWindow() {
    this.windowService.open(MyComponent, {
      width: 50, // 50vw (50% of viewport width)
      height: 40, // 40vh (40% of viewport height)
      x: 25, // 25vw from left
      y: 30, // 30vh from top
      data: { message: 'Hello World' }
    });
  }
}
```

### Accessing Data in the Window Component

You can access the passed `data` using the `WINDOW_DATA` injection token.

```typescript
import { Component, Inject, Optional } from '@angular/core';
import { WINDOW_DATA } from 'redim-windows';

@Component({ ... })
export class MyComponent {
  constructor(@Optional() @Inject(WINDOW_DATA) public data: any) {
    console.log(data); // { message: 'Hello World' }
  }
}
```

### Using CSS Variables

The window container automatically sets CSS variables `--window-width` and `--window-height` based on its current size. You can use these in your component's CSS.

```css
.my-content {
  width: 100%;
  height: 100%;
  /* Example: changing color based on width using container queries or calc */
  font-size: calc(var(--window-width) / 20);
}
```

## API

### `RedimFrameService`

- `open<T>(componentOrTemplate: Type<T> | TemplateRef<T>, config?: FloatingWindowConfig): ComponentRef<FloatingWindowComponent>`

### `FloatingWindowConfig`

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `width` | `number` | `30` | Initial width in viewport width units (vw). |
| `height` | `number` | `30` | Initial height in viewport height units (vh). |
| `x` | `number` | `10` | Initial X position in viewport width units (vw). |
| `y` | `number` | `10` | Initial Y position in viewport height units (vh). |
| `data` | `any` | `undefined` | Data to pass to the component via `WINDOW_DATA`. |

### `FloatingWindowComponent` Inputs

| Input | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `resizeBorder` | `number` | `0.5` | Thickness of the resize handles in vw. |
| `minWidth` | `number` | `10` | Minimum width in vw. |
| `minHeight` | `number` | `10` | Minimum height in vh. |
| `scrollIcon` | `string` | `''` | URL for the custom scrollbar thumb image. |
| `scrollThumbSize` | `number` | `2` | Size of the scrollbar thumb in vw. |

### `VirtualScrollbarComponent`

You can use the custom scrollbar independently to wrap any content.

```html
<lib-virtual-scrollbar [scrollIcon]="'assets/icon.png'" [scrollThumbSize]="2">
  <div style="height: 200vh">Long content...</div>
</lib-virtual-scrollbar>
```

| Input | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `scrollIcon` | `string` | `''` | URL for the thumb image. If empty, a CSS circle is used. |
| `scrollThumbSize` | `number` | `2` | Size of the thumb in vw. |

