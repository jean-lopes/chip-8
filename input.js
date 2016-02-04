window.addEventListener('load', function() {
    var key0 = document.getElementById('key0'),
        key1 = document.getElementById('key1'),
        key2 = document.getElementById('key2'),
        key3 = document.getElementById('key3'),
        key4 = document.getElementById('key4'),
        key5 = document.getElementById('key5'),
        key6 = document.getElementById('key6'),
        key7 = document.getElementById('key7'),
        key8 = document.getElementById('key8'),
        key9 = document.getElementById('key9'),
        keyA = document.getElementById('keyA'),
        keyB = document.getElementById('keyB'),
        keyC = document.getElementById('keyC'),
        keyD = document.getElementById('keyD'),
        keyE = document.getElementById('keyE'),
        keyF = document.getElementById('keyF');

    var setBackground = function(button, color) {
        button.style.background = color;
    };

    var fireChip8KeyPress = function (eventName, value) {
        document.dispatchEvent(new CustomEvent('chip8.' + eventName, { detail : { chip: chip,  key : value } }));
    };

    setButtonBackground = function(eventName, keyCode, color) {
        switch (keyCode) {
            case 49:
                setBackground(key1, color);
                fireChip8KeyPress(eventName, 0x1);
                break;
            case 50:
                setBackground(key2, color);
                fireChip8KeyPress(eventName, 0x2);
                break;
            case 51:
                setBackground(key3, color);
                fireChip8KeyPress(eventName, 0x3);
                break;
            case 52:
                setBackground(keyC, color);
                fireChip8KeyPress(eventName, 0xC);
                break;
            case 81:
                setBackground(key4, color);
                fireChip8KeyPress(eventName, 0x4);
                break;
            case 87:
                setBackground(key5, color);
                fireChip8KeyPress(eventName, 0x5);
                break;
            case 69:
                setBackground(key6, color);
                fireChip8KeyPress(eventName, 0x6);
                break;
            case 82:
                setBackground(keyD, color);
                fireChip8KeyPress(eventName, 0xD);
                break;
            case 65:
                setBackground(key7, color);
                fireChip8KeyPress(eventName, 0x7);
                break;
            case 83:
                setBackground(key8, color);
                fireChip8KeyPress(eventName, 0x8);
                break;
            case 68:
                setBackground(key9, color);
                fireChip8KeyPress(eventName, 0x9);
                break;
            case 70:
                setBackground(keyE, color);
                fireChip8KeyPress(eventName, 0xE);
                break;
            case 90:
                setBackground(keyA, color);
                fireChip8KeyPress(eventName, 0xA);
                break;
            case 88:
                setBackground(key0, color);
                fireChip8KeyPress(eventName, 0x0);
                break;
            case 67:
                setBackground(keyB, color);
                fireChip8KeyPress(eventName, 0xB);
                break;
            case 86:
                setBackground(keyF, color);
                fireChip8KeyPress(eventName, 0xF);
                break;
            default:
                break;
        }
    }

    window.addEventListener('keydown', function(e) {
        setButtonBackground('keydown', e.keyCode, 'grey');
    });

    window.addEventListener('keyup', function(e) {
        setButtonBackground('keyup', e.keyCode, '');
    });
});