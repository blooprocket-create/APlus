"""Key poses for the Hearthmere hero actions. Angles are game-space XYZ degrees."""

JOINTS = {
    "hips": "Hips", "head": "Head", "hair": "Hair", "coat": "Coat", "weapon": "Weapon",
    "left_arm": "UpperArm.L", "right_arm": "UpperArm.R", "left_elbow": "Forearm.L",
    "right_elbow": "Forearm.R", "left_leg": "Thigh.L", "right_leg": "Thigh.R",
    "left_knee": "Shin.L", "right_knee": "Shin.R",
    "left_foot": "Foot.L", "right_foot": "Foot.R",
    "hem": "Coat.Hem", "offhand": "Weapon.L",
}

IDLE = {
    "warrior": dict(hips=(3, -7, 0), head=(-3, 7, 0), left_arm=(-24, -13, -17),
                    right_arm=(-14, 15, 18), left_elbow=(-54, 0, 0), right_elbow=(-49, 0, 0),
                    left_leg=(-11, 0, -5), right_leg=(9, 0, 6), left_knee=(15, 0, 0),
                    right_knee=(9, 0, 0), weapon=(-12, 36, -6), coat=(12, 2, -4), hair=(8, 0, 3)),
    "mage": dict(hips=(0, -8, -2), head=(1, 8, 1), left_arm=(-18, -10, -19),
                 right_arm=(-14, 16, 21), left_elbow=(-40, 0, 0), right_elbow=(-62, 0, 0),
                 left_leg=(-9, 0, -5), right_leg=(6, 0, 6), left_knee=(10, 0, 0),
                 right_knee=(10, 0, 0), weapon=(-9, 33, 7), coat=(7, 0, 2), hair=(8, 0, 4)),
    "assassin": dict(hips=(8, 16, 2), head=(-6, -14, -2), left_arm=(-18, -12, -29),
                     right_arm=(-9, 11, 33), left_elbow=(-42, 0, 0), right_elbow=(-41, 0, 0),
                     left_leg=(-15, 0, -13), right_leg=(-5, 0, 15), left_knee=(18, 0, 0),
                     right_knee=(18, 0, 0), weapon=(-19, 40, -9), offhand=(-17, -38, 11),
                     coat=(12, -7, -8), hair=(11, 0, 6)),
}

# Frame at which the weapon connects or the spell leaves the hand.
RELEASE = {
    "warrior": dict(thrust=4, reverse=5, sweep=7, skill1=6, skill2=8, eclipse=7),
    "mage": dict(thrust=5, reverse=6, sweep=6, skill1=6, skill2=8, eclipse=6),
    "assassin": dict(thrust=4, reverse=5, sweep=5, skill1=6, skill2=7, eclipse=6),
}

SPEAR_ADVANCE = {"thrust": .45, "reverse": .45, "sweep": .65}

# Foot marks are measured from the start of the strike, including game travel.
# Each key gives frame, horizontal position, lift, and toe angle.
SPEAR_STANCE = {
    "thrust": {
        "L": [(1, -.17, .08, 0, -8), (2, -.18, .17, .065, -8), (4, -.20, .67, 0, -10),
              (8, -.20, .67, 0, -10), (11, -.16, .57, .057, -8), (14, -.14, .52, 0, -5)],
        "R": [(1, .17, -.085, 0, 19), (6, .17, -.085, 0, 19), (9, .21, .27, .12, 13),
              (11, .16, .35, 0, 7), (14, .16, .35, 0, 7)],
    },
    "reverse": {
        "L": [(1, -.17, -.07, 0, -22), (7, -.17, -.07, 0, -22), (10, -.24, .27, .11, -13),
              (12, -.14, .52, 0, -8), (15, -.14, .52, 0, -5)],
        "R": [(1, .17, .11, 0, 8), (3, .20, .34, .12, 10), (5, .19, .68, 0, 11),
              (9, .19, .68, 0, 11), (12, .16, .47, .08, 8), (15, .16, .35, 0, 7)],
    },
    "sweep": {
        "L": [(1, -.19, .14, 0, -34), (4, -.26, .34, .105, -57), (6, -.27, .71, 0, -23),
              (8, -.27, .71, 0, 60), (10, -.31, .86, .14, 116), (12, -.24, .89, 0, 196),
              (14, -.17, .81, .09, 287), (17, -.14, .72, 0, 346), (21, -.14, .72, 0, 355)],
        "R": [(1, .19, -.09, 0, -21), (4, .22, .15, .09, -37), (6, .27, .24, 0, -4),
              (8, .27, .24, 0, 79), (10, .33, .50, .12, 127), (12, .25, .51, 0, 212),
              (15, .18, .53, .07, 309), (18, .16, .55, 0, 351), (21, .16, .55, 0, 367)],
    },
}


def key(frame, position=(0, 0, 0), **angles):
    return frame, position, angles


def idle_loop(role):
    return [
        key(1),
        key(19, (0, 0.013, 0), head=(-2, 4, -2), hair=(-5, 2, 1)),
        key(36, (0, -0.006, 0), head=(1, -2, 2), coat=(-17, 3, -2)),
        key(49),
    ]


def run_loop(role):
    lean, knee, arm, recoil = {
        "warrior": (17, 91, 36, 5), "mage": (15, 98, 43, 7), "assassin": (32, 112, 53, 13),
    }[role]
    poses = [
        key(1, (0, -0.045, 0), hips=(lean, -11, -5), head=(-lean * .56, 6, 4),
            left_leg=(-58, 0, -5), right_leg=(44, 0, 7), left_knee=(12, 0, 0), right_knee=(knee, 0, 0),
            left_arm=(arm, -14, -12), right_arm=(-38, 18, 17), left_elbow=(-46, 0, 0),
            right_elbow=(-58, 0, 0), coat=(-49, 12, -11), hair=(-42, -2, -6)),
        key(4, (0.014, -0.076, 0), hips=(lean + recoil, -2, -2), head=(-14, 0, 3),
            left_leg=(-30, 0, -4), right_leg=(55, 0, 6), left_knee=(39, 0, 0), right_knee=(knee - 16, 0, 0),
            left_arm=(25, -12, -12), right_arm=(-31, 23, 17), coat=(-65, -5, -8), hair=(-53, 4, 8)),
        key(7, (0.008, 0.033, 0), hips=(lean, 5, 3), head=(-lean * .6, -4, -4),
            left_leg=(24, 0, -4), right_leg=(-20, 0, 6), left_knee=(13, 0, 0), right_knee=(62, 0, 0),
            left_arm=(-21, -12, -15), right_arm=(-12, 21, 17), coat=(-57, -7, 11), hair=(-50, 1, -4)),
        key(11, (0, -0.045, 0), hips=(lean, 11, 5), head=(-lean * .56, -6, -4),
            left_leg=(44, 0, -7), right_leg=(-58, 0, 5), left_knee=(knee, 0, 0), right_knee=(12, 0, 0),
            left_arm=(-arm, -15, -14), right_arm=(19, 22, 21), left_elbow=(-85, 0, 0),
            right_elbow=(-53, 0, 0), coat=(-49, -12, 11), hair=(-42, 2, 6)),
        key(14, (-0.014, -0.076, 0), hips=(lean + recoil, 2, 2), head=(-14, 0, -3),
            left_leg=(55, 0, -6), right_leg=(-30, 0, 4), left_knee=(knee - 16, 0, 0), right_knee=(39, 0, 0),
            left_arm=(-24, -12, -15), right_arm=(12, 21, 19), coat=(-64, 5, 8), hair=(-53, -4, -8)),
        key(17, (-0.008, 0.033, 0), hips=(lean, -5, -3), head=(-lean * .6, 4, 4),
            left_leg=(-20, 0, -6), right_leg=(24, 0, 4), left_knee=(62, 0, 0), right_knee=(13, 0, 0),
            left_arm=(7, -12, -12), right_arm=(-23, 17, 19), coat=(-57, 7, -11), hair=(-50, -1, 4)),
        key(21),  # Replaced by the opening contact pose to make a closed loop.
    ]
    carry = {
        "warrior": (.48, .41, -.78),
        "mage": (.49, .80, -.33),
    }.get(role)
    if carry:
        return [(frame, shift, dict(pose, aim=carry)) for frame, shift, pose in poses]
    return poses


def impact_reaction(role):
    drift = 13 if role == "warrior" else 20
    return [
        key(1, (0, -.035, -.048), hips=(-drift, -22, 11), head=(-13, 17, -8),
            left_arm=(-62, -19, -22), right_arm=(16, 24, 23), coat=(-48, 17, 21)),
        key(5, (.018, -.083, -.043), hips=(16, -12, -8), head=(-5, 15, 5),
            left_leg=(-31, 0, -7), right_leg=(26, 0, 8), left_knee=(37, 0, 0), right_knee=(25, 0, 0)),
        key(11),
    ]


WARRIOR = {
    "thrust": [
        key(1, (.025, -.15, -.071), hips=(14, 36, 8), head=(-9, -32, -4),
            right_arm=(31, 9, 30), right_elbow=(-80, 0, 0), aim=(.14, .04, 1),
            left_arm=(-52, -14, -32), left_elbow=(-72, 0, 0), coat=(-24, -31, 13)),
        key(2, (.022, -.18, -.098), hips=(18, 33, 5), head=(-12, -29, -4),
            right_arm=(9, 14, 27), right_elbow=(-70, 0, 0), aim=(.03, -.02, 1),
            left_arm=(-58, -9, -32), left_elbow=(-66, 0, 0), coat=(-28, -29, 12)),
        key(4, (-.025, -.16, -.13), hips=(29, -18, -7), head=(-20, 17, 4),
            right_arm=(-87, 11, 14), right_elbow=(-12, 0, 0), aim=(.01, .01, 1),
            left_arm=(-38, -4, -41), left_elbow=(-56, 0, 0), coat=(-72, 28, -16), hair=(-38, 19, -11)),
        key(6, (-.04, -.17, -.105), hips=(32, -20, -7), head=(-21, 18, 4),
            right_arm=(-84, 14, 16), right_elbow=(-16, 0, 0), aim=(.01, -.025, 1),
            left_arm=(-44, -5, -41), left_elbow=(-62, 0, 0), coat=(-60, 21, -10), hair=(-29, 17, -8)),
        key(9, (0, -.11, -.031), hips=(13, -4, 1), right_arm=(-49, 12, 24),
            right_elbow=(-61, 0, 0), aim=(.14, .54, 1), coat=(-39, -16, 8)),
        key(14, (0, -.065, 0)),
    ],
    "reverse": [
        key(1, (-.045, -.16, -.063), hips=(14, -39, -11), head=(-8, 35, 7),
            left_arm=(-36, -19, -31), left_elbow=(-71, 0, 0), right_arm=(-34, -38, 28),
            right_elbow=(-103, 0, 0), aim=(-.93, .18, .45), coat=(-37, 29, 13)),
        key(3, (-.05, -.173, -.105), hips=(18, -28, -9), head=(-9, 27, 7),
            right_arm=(-63, -32, 22), right_elbow=(-75, 0, 0), aim=(-.58, .04, .83),
            left_arm=(-42, -12, -35), left_elbow=(-74, 0, 0), coat=(-49, 31, 19)),
        key(5, (.06, -.16, -.14), hips=(14, 23, 11), head=(-10, -23, -7),
            right_arm=(-111, -21, 15), right_elbow=(-10, 0, 0), aim=(.02, .12, 1),
            left_arm=(-72, 13, -38), left_elbow=(-58, 0, 0), coat=(-69, -36, 25), hair=(-45, -17, 15)),
        key(7, (.07, -.153, -.11), hips=(16, 26, 10), head=(-11, -24, -7),
            right_arm=(-110, -19, 17), right_elbow=(-15, 0, 0), aim=(.02, .10, 1),
            left_arm=(-69, 12, -35), left_elbow=(-59, 0, 0), coat=(-61, -31, 16)),
        key(10, (.04, -.107, -.038), hips=(11, 25, 6), right_arm=(-58, 7, 25),
            right_elbow=(-68, 0, 0), aim=(.19, .53, .91), coat=(-35, -20, 8)),
        key(15, (0, -.065, 0)),
    ],
    "sweep": [
        key(1, (0, -.15, -.045), hips=(25, -45, -9), head=(-19, 34, 4), left_arm=(-60, -24, -38),
            right_arm=(-73, -47, 27), right_elbow=(-21, 0, 0), weapon=(-12, 20, 91),
            left_leg=(-37, 0, -13), right_leg=(33, 0, 17), left_knee=(42, 0, 0), coat=(-53, 43, -23)),
        key(4, (-.02, -.205, -.15), hips=(24, -67, -8), head=(-16, 45, 7), right_arm=(-69, -15, 29),
            right_elbow=(-44, 0, 0), aim=(-.84, .07, -.55), coat=(-49, -35, -14)),
        key(5, (-.065, -.20, -.18), hips=(28, -33, -12), head=(-17, 29, 6),
            right_arm=(-84, -26, 23), right_elbow=(-26, 0, 0), aim=(-.97, .025, .22), coat=(-66, -43, -19)),
        key(6, (-.07, -.20, -.24), hips=(29, 13, -9), head=(-19, -10, 5),
            right_arm=(-91, -20, 31), right_elbow=(-17, 0, 0), aim=(-.43, .01, .90), coat=(-80, -51, -22)),
        key(7, (-.04, -.18, -.25), hips=(25, 57, 6), head=(-16, -39, -5), right_arm=(-90, -11, 43),
            right_elbow=(-12, 0, 0), aim=(.65, .02, .76), coat=(-87, -19, 16), hair=(-47, -33, 15)),
        key(9, (-.03, -.14, -.22), hips=(20, 134, 11), head=(-14, -43, -4), left_arm=(-47, -14, -30),
            right_arm=(-89, -19, 32), right_elbow=(-20, 0, 0), aim=(.80, .075, -.59), coat=(-91, 43, 19)),
        key(11, (-.02, -.15, -.18), hips=(22, 220, 3), head=(-10, -33, 3),
            right_arm=(-69, -20, 24), right_elbow=(-39, 0, 0), aim=(-.41, .28, -.87), coat=(-85, 49, 16)),
        key(14, (0, -.14, -.075), hips=(19, 314, -8), head=(-16, 31, 5), right_arm=(-48, 14, 24),
            right_elbow=(-58, 0, 0), aim=(-.82, .51, .25), coat=(-66, 35, -20)),
        key(21, (0, -.065, 0), hips=(3, 353, 0)),
    ],
    "skill1": [
        key(1, (0, -.065, .065), hips=(24, -32, -8), right_arm=(-72, -26, 30), right_elbow=(-16, 0, 0),
            weapon=(-16, 19, 67), left_arm=(-63, 9, -26), left_leg=(-42, 0, -8), left_knee=(35, 0, 0)),
        key(6, (0, .08, .19), hips=(19, -13, -5), head=(-15, 13, 4), right_arm=(-111, 13, 19),
            right_elbow=(-9, 0, 0), aim=(0, .08, 1), left_arm=(-39, 13, -37),
            left_leg=(-48, 0, -9), right_leg=(32, 0, 11), left_knee=(23, 0, 0),
            right_knee=(45, 0, 0), coat=(-79, -3, 12)),
        key(11, (0, .018, .02), hips=(16, 9, -8), right_arm=(-96, 25, 18), right_elbow=(-75, 0, 0),
            coat=(-45, -19, -17)),
        key(17),
    ],
    "skill2": [
        key(1, (0, -.13, .12), hips=(38, 13, 8), head=(-25, -12, -5), right_arm=(-111, -14, 15),
            left_arm=(-99, 14, -18), right_elbow=(-34, 0, 0), left_elbow=(-47, 0, 0),
            weapon=(33, -26, 85), left_leg=(-39, 0, -16), right_leg=(31, 0, 15),
            left_knee=(57, 0, 0), right_knee=(34, 0, 0), coat=(-66, 3, 13)),
        key(4, (0, .095, -.045), hips=(-8, 6, -5), head=(5, -6, 4), right_arm=(-147, 4, 32),
            right_elbow=(-37, 0, 0), aim=(.55, .28, -.8), left_arm=(-40, 15, -40),
            left_leg=(-47, 0, -13), left_knee=(64, 0, 0), right_knee=(24, 0, 0), coat=(-55, 1, 10)),
        key(8, (0, -.15, .08), hips=(35, 2, -7), head=(-28, 5, 6), right_arm=(-49, 1, 21),
            right_elbow=(-12, 0, 0), aim=(.22, -.36, .91), left_arm=(-74, 9, -37),
            left_leg=(-30, 0, -19), right_leg=(14, 0, 17), left_knee=(52, 0, 0),
            right_knee=(41, 0, 0), coat=(-72, 1, 11)),
        key(11, (0, -.035, .03), hips=(12, -12, 5), right_arm=(-46, 18, 20), right_elbow=(-70, 0, 0)),
        key(17),
    ],
    "charge": [
        key(1),
        key(6, (0, -.04, -.025), hips=(15, 20, -6), left_arm=(-63, 9, -21), right_arm=(-31, 14, 29),
            left_elbow=(-79, 0, 0), right_elbow=(-88, 0, 0), weapon=(4, 15, 44), coat=(-38, -12, -13)),
        key(12, (0, -.113, -.08), hips=(27, 61, 12), head=(-14, -47, -4), left_arm=(-98, 19, -27),
            right_arm=(-22, 41, 46), right_elbow=(-101, 0, 0), weapon=(14, 29, 90),
            left_leg=(-39, 0, -13), right_leg=(28, 0, 16), left_knee=(52, 0, 0), right_knee=(39, 0, 0),
            coat=(-62, -34, 19), hair=(-49, -11, 16)),
    ],
    "eclipse": [
        key(1),  # Starts from the fully charged pose.
        key(4, (0, .09, .05), hips=(9, 126, 13), head=(-8, -56, -6), left_arm=(-72, -4, -43),
            right_arm=(-91, -14, 45), right_elbow=(-17, 0, 0), aim=(.65, .43, -.61),
            left_leg=(-31, 0, -10), right_knee=(42, 0, 0), coat=(-83, 31, 16)),
        key(7, (0, .20, .18), hips=(15, 224, -12), head=(-10, 30, 7), left_arm=(-77, 10, -46),
            right_arm=(-96, -19, 48), right_elbow=(-8, 0, 0), aim=(-.94, -.02, .35),
            left_leg=(-39, 0, -13), right_leg=(27, 0, 16), right_knee=(61, 0, 0),
            coat=(-96, 33, 20), hair=(-68, 16, 18)),
        key(11, (0, .10, .09), hips=(11, 281, -6), right_arm=(-80, -12, 41),
            right_elbow=(-19, 0, 0), aim=(-.46, .15, .88), coat=(-81, 29, -19)),
        key(15, (0, -.12, .067), hips=(32, 329, 7), head=(-18, 23, -4), right_arm=(-91, 6, 13),
            right_elbow=(-32, 0, 0), left_leg=(-44, 0, -8), left_knee=(58, 0, 0), coat=(-74, 28, 14)),
        key(24, hips=(3, 353, 0)),
    ],
    "evade": [
        key(1, (0, -.08, .037), hips=(25, -15, 9), left_arm=(-75, -3, -19), right_arm=(-32, 23, 31),
            aim=(.50, .41, -.76), left_leg=(-52, 0, -8), right_leg=(32, 0, 9),
            left_knee=(52, 0, 0), coat=(-61, 8, 11)),
        key(5, (0, -.115, .115), hips=(49, -18, -7), head=(-29, 19, 6), left_arm=(-49, -13, -16),
            right_arm=(34, 28, 27), right_elbow=(-36, 0, 0), aim=(.51, .24, -.85),
            left_leg=(-55, 0, -7), right_leg=(39, 0, 10), right_knee=(67, 0, 0), coat=(-88, 19, -8)),
        key(9, (0, -.09, .016), hips=(21, 3, 7), right_arm=(-28, 18, 41), right_elbow=(-39, 0, 0),
            aim=(.73, .61, -.2), left_leg=(14, 0, -7), right_leg=(-36, 0, 10),
            right_knee=(41, 0, 0), coat=(-69, -11, 17)),
        key(14),
    ],
}

MAGE = {
    "thrust": [
        key(1, (0, -.035, -.025), hips=(7, 24, -7), head=(-5, -23, 3),
            right_arm=(-29, 24, 27), right_elbow=(-52, 0, 0), aim=(.34, .9, -.11),
            left_arm=(13, -4, -43), left_elbow=(-115, 0, 0), offhand=(-17, -19, -12),
            gesture="gather", coat=(-30, -19, -15)),
        key(5, (0, .018, .11), hips=(14, -8, 4), head=(-11, 8, -3),
            right_arm=(-35, 9, 40), right_elbow=(-36, 0, 0), aim=(.57, .64, .29),
            left_arm=(-83, 10, -24), left_elbow=(-9, 0, 0), offhand=(17, 9, -4),
            gesture="flare", hair=(-39, 4, 13)),
        key(11, hips=(0, 14, -2), right_arm=(-48, 20, 16), right_elbow=(-88, 0, 0)),
        key(15),
    ],
    "reverse": [
        key(1, (-.052, .01, .029), hips=(8, 37, 9), left_arm=(-102, 11, -15), left_elbow=(-8, 0, 0),
            right_arm=(-39, 25, 32), right_elbow=(-83, 0, 0), weapon=(-26, -33, 22), coat=(-45, -31, 21)),
        key(6, (-.031, .062, .04), hips=(-6, 2, -7), left_arm=(-112, 14, -39), left_elbow=(-24, 0, 0),
            right_arm=(-85, -16, 63), right_elbow=(-12, 0, 0), aim=(.93, .1, .28),
            offhand=(12, -20, -6), gesture="ward", hair=(-37, 6, -14)),
        key(15),
    ],
    "sweep": [
        key(1, (0, .11, .034), hips=(-11, -25, -12), head=(10, 20, 3), left_arm=(-101, -20, -40),
            right_arm=(-112, 13, 25), right_elbow=(-26, 0, 0), weapon=(-25, 45, 32),
            left_leg=(-22, 0, -10), right_leg=(23, 0, 11), coat=(-57, 25, -18)),
        key(6, (0, .24, .006), hips=(-14, 35, 13), head=(12, -28, -5), left_arm=(-121, 11, -54),
            right_arm=(-130, -11, 41), right_elbow=(-11, 0, 0), left_elbow=(-18, 0, 0),
            weapon=(11, 3, 72), offhand=(16, -5, 9), gesture="offer",
            left_knee=(33, 0, 0), right_knee=(42, 0, 0), coat=(-83, -20, 34)),
        key(12, (0, .105, -.022), hips=(11, 12, 7), right_arm=(-72, 24, 29), right_elbow=(-51, 0, 0),
            left_arm=(-49, -19, -35), coat=(-72, -13, -18)),
        key(19),
    ],
    "skill1": [
        key(1, (0, .062, -.032), hips=(-8, 25, 11), left_arm=(-104, 12, -32), left_elbow=(-14, 0, 0),
            right_arm=(-112, -14, 24), right_elbow=(-72, 0, 0), weapon=(-38, -4, 71),
            offhand=(-19, 13, 8), gesture="gather", coat=(-63, -16, 23)),
        key(6, (0, .03, .04), hips=(24, -13, -11), head=(-18, 13, 8), left_arm=(-68, 11, -33),
            left_elbow=(-12, 0, 0), right_arm=(19, 14, 42), right_elbow=(-21, 0, 0),
            aim=(.65, -.39, .31), offhand=(18, 8, -7), gesture="flare",
            left_leg=(-31, 0, -14), right_leg=(21, 0, 13),
            left_knee=(41, 0, 0), coat=(-53, 23, -28)),
        key(12, (0, .041, 0), hips=(4, -15, 2), left_arm=(-62, -21, -34), left_elbow=(-66, 0, 0)),
        key(18),
    ],
    "skill2": [
        key(1, (0, .15, 0), hips=(-16, -19, -11), head=(12, 17, 8), right_arm=(-157, -17, 36),
            right_elbow=(-26, 0, 0), left_arm=(-114, -11, -29), weapon=(-13, 31, 49), coat=(-62, 18, -20)),
        key(8, (0, .075, .026), hips=(11, 6, 8), head=(-8, -4, -6), right_arm=(-144, -9, 39),
            right_elbow=(-18, 0, 0), left_arm=(-26, 4, -46), left_elbow=(-19, 0, 0),
            aim=(.18, .95, .1), offhand=(4, 7, 13), gesture="ward", coat=(-76, -7, 19)),
        key(14, (0, -.034, 0), hips=(14, -5, 1), left_leg=(-23, 0, -6), left_knee=(37, 0, 0)),
        key(20),
    ],
    "charge": [
        key(1),
        key(6, (0, .071, 0), hips=(-11, -18, -6), head=(7, 12, 3), left_arm=(-97, -6, -26),
            right_arm=(-121, -13, 27), right_elbow=(-50, 0, 0), weapon=(-31, 28, 55),
            offhand=(-14, 17, 9), gesture="gather", coat=(-47, 8, -18)),
        key(12, (0, .22, 0), hips=(-21, -32, -13), head=(14, 28, 9), left_arm=(-141, 19, -24),
            right_arm=(-154, -11, 31), right_elbow=(-32, 0, 0), weapon=(-28, 44, 62),
            left_leg=(-21, 0, -10), right_leg=(24, 0, 8), right_knee=(51, 0, 0),
            offhand=(11, 12, 9), gesture="offer", coat=(-84, 31, -23)),
    ],
    "eclipse": [
        key(1, (0, .27, .025), hips=(3, -28, -12), head=(-3, 21, 7), right_arm=(-139, -12, 28),
            right_elbow=(-18, 0, 0), left_arm=(-121, -9, -23), weapon=(-6, 34, 59),
            left_leg=(-36, 0, -9), right_leg=(28, 0, 13), right_knee=(46, 0, 0),
            offhand=(11, 12, 9), gesture="offer", coat=(-96, 22, -28)),
        key(6, (0, .33, .08), hips=(14, -8, 13), head=(-11, 11, -9), right_arm=(-98, -13, 74),
            right_elbow=(-8, 0, 0), left_arm=(-130, -8, -27), left_elbow=(-42, 0, 0),
            aim=(.89, .21, .41), offhand=(20, 5, 8), gesture="flare",
            left_leg=(-24, 0, -14), right_leg=(19, 0, 18),
            right_knee=(41, 0, 0), coat=(-81, -19, 27)),
        key(13, (0, .135, .019), hips=(17, 41, -4), head=(-13, -33, 2), right_arm=(-76, 11, 39),
            right_elbow=(-35, 0, 0), left_arm=(-84, -6, -30), coat=(-73, -31, -14)),
        key(19, (0, -.051, 0), hips=(17, -13, -6), left_leg=(-27, 0, -6), left_knee=(37, 0, 0),
            right_knee=(25, 0, 0), coat=(-56, 15, 9)),
        key(25),
    ],
    "evade": [
        key(1, (0, .06, -.034), hips=(-9, 28, -17), head=(1, -18, 10), left_arm=(-107, -4, -34),
            right_arm=(-72, 18, 33), right_elbow=(-63, 0, 0), left_leg=(-38, 0, -12), right_knee=(56, 0, 0),
            weapon=(-12, 39, 49), coat=(-76, -17, -21)),
        key(5, (0, .15, .018), hips=(13, -22, 17), left_arm=(-75, -26, -53), right_arm=(-32, 28, 56),
            left_leg=(-13, 0, -10), right_leg=(24, 0, 12), right_knee=(68, 0, 0), coat=(-98, 28, 23)),
        key(10, (0, -.055, 0), hips=(19, 11, 2), left_knee=(38, 0, 0), right_knee=(28, 0, 0)),
        key(15),
    ],
}

ASSASSIN = {
    "thrust": [
        key(1, (.025, -.09, -.075), hips=(20, 38, 9), head=(-16, -36, -8), right_arm=(22, 14, 47),
            right_elbow=(-101, 0, 0), left_arm=(-53, 19, -33), left_elbow=(-62, 0, 0),
            left_leg=(-31, 0, -14), right_leg=(17, 0, 17), left_knee=(46, 0, 0), coat=(-45, -33, -19)),
        key(4, (.04, -.055, .13), hips=(26, -9, -10), right_arm=(-94, 12, 42), right_elbow=(-11, 0, 0),
            left_arm=(-86, -5, -34), left_elbow=(-12, 0, 0), aim=(.23, .07, 1), offhand_aim=(-.23, .06, 1),
            head=(-18, 9, 7), coat=(-69, 34, -22), hair=(-48, -11, 8)),
        key(7, (.015, -.038, .085), hips=(15, -21, -4), right_arm=(-42, 16, 50),
            right_elbow=(-34, 0, 0), left_arm=(-40, 6, -48), left_elbow=(-23, 0, 0), coat=(-54, 22, -12)),
        key(12),
    ],
    "reverse": [
        key(1, (-.041, -.074, -.04), hips=(19, 45, 14), head=(-13, -39, -8), left_arm=(-36, 33, -29),
            left_elbow=(-87, 0, 0), right_arm=(-44, -25, 25), right_elbow=(-82, 0, 0),
            right_leg=(-32, 0, 11), left_leg=(31, 0, -13), right_knee=(39, 0, 0), coat=(-55, -36, 16)),
        key(5, (-.05, -.046, .12), hips=(19, 12, 8), left_arm=(-87, -17, -69), left_elbow=(-9, 0, 0),
            right_arm=(-77, 19, 66), right_elbow=(-13, 0, 0), aim=(.65, .05, 1), offhand_aim=(-.65, .07, 1),
            head=(-15, -12, -7), coat=(-72, -35, 22)),
        key(12),
    ],
    "sweep": [
        key(1, (0, -.092, -.07), hips=(23, 36, -10), head=(-16, -30, 3), left_arm=(-56, 14, -35),
            right_arm=(-28, 40, 41), right_elbow=(-94, 0, 0), left_elbow=(-65, 0, 0),
            left_leg=(-28, 0, -9), right_leg=(24, 0, 14), left_knee=(49, 0, 0), coat=(-56, -27, -19)),
        key(5, (.021, .19, -.06), hips=(-6, -27, -18), head=(6, 24, 8), left_arm=(-70, -18, -55),
            right_arm=(-96, 11, 38), right_elbow=(-10, 0, 0), left_elbow=(-22, 0, 0),
            aim=(.09, .10, 1), offhand_aim=(-.72, .14, .68), left_leg=(-43, 0, -11),
            right_leg=(26, 0, 15), right_knee=(51, 0, 0), coat=(-81, 36, -26)),
        key(9, (.025, .26, -.135), hips=(5, -146, 21), left_arm=(-86, -15, -58),
            right_arm=(-78, 21, 63), left_knee=(68, 0, 0), right_knee=(81, 0, 0), coat=(-103, -30, 18)),
        key(13, (0, .09, -.10), hips=(17, -263, -13), head=(-9, -21, 8), left_arm=(-65, -7, -40),
            right_arm=(-53, 30, 39), left_leg=(-36, 0, -11), left_knee=(47, 0, 0), coat=(-90, -26, -16)),
        key(17, (0, -.12, -.05), hips=(28, -326, -8), head=(-19, -16, 6), left_leg=(-32, 0, -13),
            left_knee=(42, 0, 0), right_leg=(12, 0, 14), right_knee=(33, 0, 0), coat=(-67, -14, -11)),
        key(20, hips=(8, -344, 2)),
    ],
    "skill1": [
        key(1, (0, -.091, .041), hips=(27, 11, -10), head=(-23, -7, 8), left_arm=(-96, 35, -21),
            right_arm=(-97, -31, 20), left_elbow=(-38, 0, 0), right_elbow=(-33, 0, 0),
            left_leg=(-35, 0, -14), left_knee=(58, 0, 0), coat=(-59, 14, -20)),
        key(4, (.035, -.133, -.025), hips=(33, 26, -15), head=(-24, -26, 11),
            left_arm=(-70, 38, -16), right_arm=(-61, -43, 24), left_elbow=(-95, 0, 0),
            right_elbow=(-103, 0, 0), left_leg=(-42, 0, -12), right_leg=(14, 0, 13),
            left_knee=(63, 0, 0), right_knee=(30, 0, 0), coat=(-47, -8, -19), hem=(-20, 10, 8)),
        key(6, (-.034, .052, .104), hips=(19, -23, -11), head=(-16, 23, 7),
            left_arm=(-104, -39, -65), right_arm=(-79, 39, 63), left_elbow=(-9, 0, 0),
            right_elbow=(-13, 0, 0), aim=(.51, .15, .85), offhand_aim=(-.51, .13, .85),
            left_leg=(-42, 0, -14), right_leg=(25, 0, 9), left_knee=(28, 0, 0),
            right_knee=(36, 0, 0), coat=(-72, 11, 13), hem=(-24, -11, -12)),
        key(9, (-.05, .035, .091), hips=(15, -36, -16), head=(-13, 30, 9),
            left_arm=(-100, -21, -79), right_arm=(-66, 37, 78), left_elbow=(-16, 0, 0),
            right_elbow=(-23, 0, 0), aim=(.87, -.12, .46), offhand_aim=(-.91, .08, .42),
            left_leg=(-31, 0, -12), right_leg=(23, 0, 13), left_knee=(32, 0, 0),
            right_knee=(42, 0, 0), coat=(-92, 32, 31), hem=(-23, -14, 9)),
        key(13, (-.02, -.07, .045), hips=(26, -9, 7), head=(-19, 9, -4),
            left_arm=(-49, -13, -44), right_arm=(-29, 17, 47), left_elbow=(-47, 0, 0),
            right_elbow=(-56, 0, 0), left_leg=(-29, 0, -9), right_knee=(36, 0, 0), coat=(-58, 14, 11)),
        key(18),
    ],
    "skill2": [
        key(1, (.11, -.062, .035), hips=(28, -41, 23), head=(-16, 33, -10), right_arm=(-122, -16, 19),
            right_elbow=(-13, 0, 0), left_arm=(-25, 28, -36), left_elbow=(-77, 0, 0),
            right_leg=(-47, 0, 13), left_leg=(31, 0, -12), right_knee=(54, 0, 0), coat=(-71, 22, 23)),
        key(7, (-.066, .09, .05), hips=(12, 57, -18), head=(-8, -42, 9), left_arm=(-111, 6, -27),
            left_elbow=(-13, 0, 0), right_arm=(-42, 31, 37), weapon=(-4, 38, -21), coat=(-89, -37, -24)),
        key(13, (-.012, -.058, 0), hips=(19, 26, -7), right_arm=(-42, 24, 25), right_elbow=(-58, 0, 0)),
        key(19),
    ],
    "charge": [
        key(1),
        key(6, (0, -.069, -.041), hips=(26, 33, 11), head=(-18, -27, -8), left_arm=(-66, 41, -14),
            right_arm=(-54, -31, 26), left_elbow=(-78, 0, 0), right_elbow=(-94, 0, 0),
            left_knee=(43, 0, 0), right_knee=(41, 0, 0), coat=(-53, -23, 17)),
        key(12, (0, -.159, -.078), hips=(44, 48, 16), head=(-30, -41, -10), left_arm=(-76, 49, -19),
            right_arm=(-71, -51, 19), left_elbow=(-99, 0, 0), right_elbow=(-105, 0, 0),
            left_leg=(-49, 0, -8), right_leg=(27, 0, 13), left_knee=(72, 0, 0), right_knee=(55, 0, 0),
            coat=(-76, -37, 24), hair=(-67, 18, 15)),
    ],
    "eclipse": [
        key(1, (0, .034, .105), hips=(28, -21, -17), head=(-16, 15, 7), left_arm=(-101, -24, -39),
            right_arm=(-111, 23, 41), left_elbow=(-16, 0, 0), right_elbow=(-13, 0, 0),
            left_leg=(-48, 0, -13), right_leg=(33, 0, 17), left_knee=(49, 0, 0), coat=(-87, 41, -29)),
        key(6, (.031, .26, .082), hips=(-13, -115, -26), left_arm=(-89, -22, -75), right_arm=(-84, 26, 72),
            left_elbow=(-13, 0, 0), right_elbow=(-12, 0, 0), left_leg=(-27, 0, -15), right_leg=(39, 0, 22),
            right_knee=(98, 0, 0), left_knee=(62, 0, 0), coat=(-112, -41, -31)),
        key(10, (.037, .28, .036), hips=(4, -229, 20), head=(-6, -18, -12), left_arm=(-64, -32, -66),
            right_arm=(-119, 36, 61), right_elbow=(-14, 0, 0), left_knee=(73, 0, 0), right_knee=(89, 0, 0),
            coat=(-102, -38, 26)),
        key(15, (0, -.17, .071), hips=(41, -324, -13), head=(-28, -29, 7), left_arm=(-75, -4, -35),
            right_arm=(17, 31, 45), left_leg=(-57, 0, -14), right_leg=(44, 0, 16), left_knee=(68, 0, 0),
            right_knee=(53, 0, 0), coat=(-79, -41, -24)),
        key(25, hips=(8, -344, 2)),
    ],
    "evade": [
        key(1, (0, -.11, -.041), hips=(29, 20, -11), head=(-20, -17, 8), left_arm=(-86, -16, -19),
            right_arm=(49, 28, 25), right_elbow=(-25, 0, 0), left_leg=(-47, 0, -11), right_leg=(36, 0, 12),
            left_knee=(54, 0, 0), right_knee=(62, 0, 0), coat=(-84, -22, -19)),
        key(5, (0, .093, .081), hips=(49, -38, 22), head=(-29, 26, -13), left_arm=(-61, -24, -43),
            right_arm=(81, 31, 28), right_elbow=(-19, 0, 0), left_leg=(-63, 0, -9), right_leg=(49, 0, 17),
            left_knee=(69, 0, 0), right_knee=(95, 0, 0), coat=(-108, 37, 26)),
        key(10, (0, -.118, .029), hips=(36, 13, 7), head=(-24, -8, -7), left_arm=(-72, -19, -24),
            right_arm=(28, 23, 23), left_leg=(-41, 0, -7), left_knee=(51, 0, 0), right_knee=(57, 0, 0)),
        key(15),
    ],
}


def actions_for(role):
    actions = dict({"warrior": WARRIOR, "mage": MAGE, "assassin": ASSASSIN}[role])
    run = run_loop(role)
    run[-1] = (21, run[0][1], run[0][2])
    actions.update(idle=idle_loop(role), run=run, hit=impact_reaction(role))
    actions["eclipse"] = [(1, *actions["charge"][-1][1:]), *actions["eclipse"][1:]]
    # Keep the cloth behind the body as the hero accelerates.
    pitch_gain = {"warrior": .79, "mage": .59, "assassin": .68}[role]
    for clip, poses in actions.items():
        adjusted = []
        for frame, shift, overrides in poses:
            pose = overrides.copy()
            if "coat" in pose:
                pitch, yaw, roll = pose["coat"]
                pose["coat"] = (min(79, -pitch * pitch_gain), yaw * .71, roll * .87)
            if "hair" in pose:
                pitch, yaw, roll = pose["hair"]
                pose["hair"] = (min(48, -pitch * .67), yaw, roll)
            adjusted.append((frame, shift, pose))
        actions[clip] = adjusted
    return actions
