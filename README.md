# thunderbird-fluent

A Fluent theme for Thunderbird.

## Features

- Reworked layout and appearance to match Microsoft Fluent 2's design system.
- Light, Dark, or follow system mode option.
- Toggleable mica background with transparency control.

## Preview

![inbox](screenshots/inbox.png)

## Install

1. Download `thunderbird-fluent.xpi` from the
   [latest release](https://github.com/Narcasung/thunderbird-fluent/releases/latest).
2. Install it from the Add-ons Manager: gear icon > Install Add-on From File.
3. Restart Thunderbird.

You can change the options in Add-ons Manager > Extensions > Thunderbird Fluent > Options tab.

![options](screenshots/options.png)

The extension's theme mode option automatically switches Thunderbird's own setting as well as its own CSS files theme override. Don't change Thunderbird's theme manually or this theme will not work correctly.

Recommended Thunderbird settings to get the preview's look:

- View:
   - Layout:
      - Vertical View: On
      - Message List Header: Off
   - Toolbars:
      - Menu Bar: Off
      - Spaces Toolbar: Off
- Font Size: 13px
- Density: Relaxed


## What the extension does

The extension will automatically change those prefs depending on your options:

- `widget.windows.mica`
- `widget.windows.mica.toplevel-backdrop`

It will also set `toolkit.legacyUserProfileCustomizations.stylesheets` to `true`

It will install those files to your profile folder:

- `chrome\userChrome.css`
- `chrome\userContent.css`
- `chrome\fluent-tokens.css`
- `chrome\fluent-chrome.css`
- `chrome\fluent-layout.css`
- `chrome\fluent-lists.css`
- `chrome\fluent-icons.css`
- `chrome\fluent-account-central.css`
- `chrome\fluent-calendar.css`
- `chrome\fluent-search-results.css`

Windows path: `%USERPROFILE%\AppData\Roaming\Thunderbird\Profiles\<profile>`\
To find the folder: Help > Troubleshooting Information > Profile Folder >
Open Folder.

**If you already had a `userChrome.css` or `userContent.css` of your own, back
it up before installing.**

## Uninstall

Remove the extension from the Add-ons Manager and restart.

- Removing/disabling the extension should reset the aforementionned prefs. If you still notice undesired transparency, reset them yourself. (Settings > General > Config Editor at the bottom)
- Removing/disabling the extension should delete the aforementionned files. If you still notice theme leftovers, verify in your profile folder if the files are still present and delete them.
- Removing the extension also puts back whichever Thunderbird theme you were using before you installed it.
- Disabling keeps your extension options, so re-enabling brings back the theme you had. Removing forgets them.