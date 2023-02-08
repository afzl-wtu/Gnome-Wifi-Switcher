/*
Developed By Muhammad Afzal Tahir.
https://afzal.website

*/
const GETTEXT_DOMAIN = "Afzal Tahir";

const { GObject, St, NM, GLib, Gio } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();

var setTimer = null;
var client = null;
var activeWifi = null;
var wifi;
var wifi_ssids = [];
var extrasInMenu = 1;
var menu;
var button;
var buttonBox;
var settingss;

const NMConnectionCategory = {
  WIFI: "802-11-wireless",
};

var NMConnectionWifi = class {
  constructor(type) {
    this._type = type;
  }

  _getWifiConnections(client) {
    const wifiConnections = [];
    const connections = client.get_connections();
    for (var i in connections) {
      if (connections[i].get_connection_type() == this._type) {
        wifiConnections.push(connections[i]);
      }
    }
    return wifiConnections;
  }

  _getWifiConnectionsNames(client) {
    const wifiConnectionsNames = [];
    const connections = this._getWifiConnections(client);
    for (var i in connections) {
      wifiConnectionsNames.push(connections[i].get_id());
    }
    return wifiConnectionsNames;
  }

  _openSettings() {
    GLib.spawn_command_line_async("nm-connection-editor");
  }

  _updateStatus(_device, item, id) {
    var isPresent = false;
    for (var i in wifi_ssids) {
      if (wifi_ssids[i] == id) {
        isPresent = true;
      }
    }
    if (isPresent) {
      item.setToggleState(true);
    } else {
      item.setToggleState(false);
    }
  }
  _conection() {
    var needToNull = true;
    for (i in wifi_ssids) {
      if (wifi_ssids[i] == activeWifi) {
        needToNull = false;
      }
    }
    if (needToNull) {
      activeWifi = null;
    }
    if (activeWifi == null) {
      var connection = client.get_connection_by_id(wifi_ssids[0]);
      client.activate_connection_async(connection, null, null, null, null);

      button.child = new St.Label({
        text: wifi_ssids[0],
      });
      Main.notify(_("Activating " + wifi_ssids[0]));
    } else {
      var nextWifiToConnect;
      var activeWifiIndex = wifi_ssids.indexOf(activeWifi);
      if (activeWifiIndex < wifi_ssids.length - 1) {
        nextWifiToConnect = wifi_ssids[activeWifiIndex + 1];
      } else {
        nextWifiToConnect = wifi_ssids[0];
      }
      var connection = client.get_connection_by_id(nextWifiToConnect);
      client.activate_connection_async(connection, null, null, null, null);

      button.child = new St.Label({
        text: nextWifiToConnect,
      });
      Main.notify(_("Activating " + nextWifiToConnect));
    }
  }
  _switchFunc(item) {
    item.connect("activate", () => {
      var a = menu._getMenuItems();
      wifi_ssids = [];
      for (var i in a) {
        if (i < a.length - extrasInMenu && a[i]._switch.state == true) {
          wifi_ssids.push(a[i].get_name());
        }
      }
      settingss.set_strv("wifi-ssids", wifi_ssids);
    });
  }

  _createSwitches(menu, client) {
    var conn_names = this._getWifiConnectionsNames(client);
    let previousConnections = settingss.get_strv("wifi-ssids");

    if (previousConnections.length < 2) {
      wifi_ssids = conn_names;
    } else {
      wifi_ssids = previousConnections;
    }
    for (var i in conn_names) {
      var connection = client.get_connection_by_id(conn_names[i]);
      var settings = connection.get_setting_connection();
      var device = client.get_device_by_iface(settings.interface_name);
      var connId = conn_names[i];
      var item = new PopupMenu.PopupSwitchMenuItem(_(connId), false);
      this._updateStatus(device, item, connId);
      this._switchFunc(item, connection, connId, client);
      item.set_name(connId);
      menu.addMenuItem(item);
    }
  }

  _updateSwitchMenu(menu, client) {
    var menuList = menu._getMenuItems();
    var connNamesList = this._getWifiConnectionsNames(client);
    var switchList = [];
    var ifaceList = [];

    //remove switches without connection
    for (var i in menuList) {
      var itemName = menuList[i].get_name();
      if (itemName != null) {
        switchList.push(itemName);
        var result = connNamesList.includes(itemName);
        if (result == false) {
          menuList[i].destroy();
        }
      }
    }

    // create switch for new connection
    for (var i in connNamesList) {
      var result = switchList.includes(connNamesList[i]);
      if (result == false) {
        var connId = connNamesList[i];
        var connection = client.get_connection_by_id(connId);
        var settings = connection.get_setting_connection();
        var device = client.get_device_by_iface(settings.interface_name);
        var item = new PopupMenu.PopupSwitchMenuItem(_(connId), false);
        this._updateStatus(device, item, connId);
        this._switchFunc(item, connection, connId, client);
        item.set_name(connId);
        menu.addMenuItem(item, 0);
      }
    }

    // update switches status
    var _newMenuList = menu._getMenuItems();
    for (i in _newMenuList) {
      var itemName = _newMenuList[i].get_name();
      if (itemName != null) {
        var connection = client.get_connection_by_id(itemName);
        var settings = connection.get_setting_connection();
        var device = client.get_device_by_iface(settings.interface_name);
        if (device != null) {
          ifaceList.push(device);
        }
        this._updateStatus(device, _newMenuList[i], itemName);
      }
    }

    // Update icon status
    if (ifaceList.length > 0) {
    } else {
    }
  }
};

const MenuGenerator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init(client, wifi) {
      super._init(0.5);
      // menu = new PopupMenu.PopupMenu(this, 0.5, St.Side.BOTTOM);

      menu = this.menu;

      // Create switches
      wifi._createSwitches(menu, client);

      //  Create setting menu
      var item_setting = new PopupMenu.PopupMenuItem(_("Network Settings"));
      item_setting.connect("activate", () => {
        wifi._openSettings();
      });
      this.menu.addMenuItem(item_setting);
    }
  }
);
function connection() {
  // var a = menu._getMenuItems();
  // wifi_ssids = [];
  // for (var i in a) {
  //   if (i < a.length - extrasInMenu && a[i]._switch.state == true) {
  //     wifi_ssids.push(a[i].get_name());
  //   }
  // }
  if (activeWifi == null) {
    var connection = client.get_connection_by_id(wifi_ssids[0]);
    client.activate_connection_async(connection, null, null, null, null);

    button.child = new St.Label({
      text: wifi_ssids[0],
    });
    Main.notify(_("Activating " + wifi_ssids[0]));
  } else {
    var nextWifiToConnect;
    var activeWifiIndex = wifi_ssids.indexOf(activeWifi);
    if (activeWifiIndex < wifi_ssids.length - 1) {
      nextWifiToConnect = wifi_ssids[activeWifiIndex + 1];
    } else {
      nextWifiToConnect = wifi_ssids[0];
    }
    var connection = client.get_connection_by_id(nextWifiToConnect);
    client.activate_connection_async(connection, null, null, null, null);

    button.child = new St.Label({
      text: nextWifiToConnect,
    });
    Main.notify(_("Activating " + nextWifiToConnect));
  }
}
class Extension {
  constructor(uuid) {
    this._uuid = uuid;

    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  _addButtons() {
    var active_connections = client.get_active_connections();

    for (var i in active_connections) {
      for (var j in wifi_ssids) {
        if (active_connections[i].get_id() == wifi_ssids[j]) {
          activeWifi = active_connections[i].get_id();
        }
      }
    }
    buttonBox = new St.BoxLayout({
      style_class: "panel-status-menu-box",
    });

    button = new St.Button({
      style_class: "panel-button",
      reactive: true,
      can_focus: true,
      track_hover: true,
    });
    var z;
    if (activeWifi == null) {
      z = "Not Connected";
    } else {
      z = activeWifi;
    }
    button.child = new St.Label({
      text: z,
    });

    button.connect("button-press-event", function (actor, event) {
      if (event.get_button() == 1) {
        connection();
      } else {
        menu.toggle();
      }
    });
    buttonBox.add(button);
  }

  _updateButton() {
    var active_connections = client.get_active_connections();
    var isConnectionActive = false;
    var otherConnectedWifi;
    for (var i in active_connections) {
      if (active_connections[i].get_connection_type() == "802-11-wireless") {
        otherConnectedWifi = active_connections[i].get_id();
      }
      if (active_connections[i].get_id() == activeWifi) {
        isConnectionActive = true;
      }
    }
    if (isConnectionActive == false) {
      activeWifi = null;
      button.child = new St.Label({
        text: "Not Connected",
      });
    }
    if (otherConnectedWifi != null) {
      activeWifi = otherConnectedWifi;
      button.child = new St.Label({
        text: otherConnectedWifi,
      });
    }
  }

  enable() {
    client = NM.Client.new(null);
    settingss = ExtensionUtils.getSettings(
      "org.gnome.shell.extensions.website.afzal"
    );
    // settingss.set_strv("wifi-ssids", []);
    wifi = new NMConnectionWifi(NMConnectionCategory.WIFI);
    new MenuGenerator(client, wifi);
    this._addButtons();
    Main.panel._rightBox.insert_child_at_index(buttonBox, 0);
    // Main.panel.addToStatusArea(this._uuid, buttonBox);
    setTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
      //wifi._updateSwitchMenu(button.menu, client);
      this._updateButton();
      return GLib.SOURCE_CONTINUE;
    });
  }

  disable() {
    client = null;
    settingss = null;
    GLib.Source.remove(setTimer);
    Main.panel._rightBox.remove_child(buttonBox);
    setTimer = null;
    wifi = null;
    // icon = null;
    button.destroy();
    button = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
