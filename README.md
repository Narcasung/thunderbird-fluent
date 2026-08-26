<h1 align="center">
	<img src="screenshots/icon.svg" width="100" alt="Logo"/>
   <br/><br/>
	thunderbird-fluent
</h1>
<p align="center">A Fluent theme for Thunderbird.</p>
<br/>
<p align="center">
	<img style="border-radius:15px" src="screenshots/inbox.png"/>
</p>

## Features

- Reworked layout and appearance to match Microsoft Fluent 2's design system.
- Light, Dark, or follow system mode option.
- Toggleable mica background with transparency control.
- Brand new icons from [Microsoft's FluentUI Icons](https://github.com/microsoft/fluentui-system-icons).

## Previews

<details>
   <summary>Calendar</summary>
   <img style="border-radius:15px" src="screenshots/calendar.png"/>
</details>
<details>
   <summary>Address Book</summary>
   <img style="border-radius:15px" src="screenshots/address.png"/>
</details>
<details>
   <summary>Settings</summary>
   <img style="border-radius:15px" src="screenshots/settings.png"/>
</details>
<details>
   <summary>Add-ons Manager with Spaces toolbar</summary>
   <img style="border-radius:15px" src="screenshots/spaces.png"/>
</details>

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

- Removing/disabling the extension should reset the aforementionned prefs.\
If you still notice undesired transparency, reset them yourself. (Settings > General > Config Editor at the bottom)
- Removing/disabling the extension should delete the aforementionned files.\
If you still notice theme leftovers, check your profile\chrome folder manually for remaining files.