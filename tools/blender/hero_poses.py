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

SPEAR_ADVANCE = {"thrust": .45, "reverse": .45, "sweep": .65, "skill1": .85}
NIGHTBLADE_RETREAT = (1.35, 17)
NIGHTBLADE_STANCE = {
    "thrust": {
        "L": [(1, -.16, .18, 0, -7), (8, -.16, .18, 0, -7),
              (10, -.18, .09, .047, -10), (12, -.16, .04, 0, -10)],
        "R": [(1, .16, -.22, 0, 18), (7, .16, -.22, 0, 18),
              (9, .17, -.125, .059, 16), (12, .16, -.11, 0, 14)],
    },
    "reverse": {
        "L": [(1, -.16, .04, 0, -10), (2, -.19, .06, .05, -16), (5, -.29, .17, 0, -26),
              (8, -.29, .17, 0, -26), (10, -.24, .10, .046, -18), (12, -.17, .03, 0, -10)],
        "R": [(1, .16, -.11, 0, 14), (8, .16, -.11, 0, 14),
              (10, .21, -.12, .051, 14), (12, .17, -.10, 0, 11)],
    },
    "skill2": {
        "L": [(1, -.17, -.08, 0, -17), (3, -.19, .02, .09, -15), (6, -.24, .36, 0, -12),
              (11, -.24, .36, 0, -12), (15, -.17, .20, .069, -10), (19, -.15, .055, 0, -8)],
        "R": [(1, .16, -.20, 0, 19), (11, .16, -.20, 0, 19),
              (14, .18, -.12, .055, 15), (19, .16, -.10, 0, 12)],
    },
}

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
    "skill1": {
        "L": [(1, -.18, .11, 0, -12), (3, -.18, .32, .13, -12), (6, -.22, 1.08, 0, -13),
              (9, -.22, 1.08, 0, -13), (13, -.17, 1.02, .07, -8), (17, -.14, .93, 0, -7)],
        "R": [(1, .17, -.085, 0, 19), (4, .17, -.085, 0, 19), (6, .21, .45, .078, 17),
              (9, .20, .59, 0, 16), (12, .20, .59, 0, 16), (15, .16, .74, .06, 10), (17, .16, .77, 0, 9)],
    },
    "skill2": {
        "L": [(1, -.18, .10, 0, -13), (4, -.19, .22, .17, -14), (8, -.22, .25, 0, -18),
              (11, -.22, .25, 0, -18), (14, -.19, .15, .061, -11), (17, -.14, .07, 0, -8)],
        "R": [(1, .19, -.13, 0, 16), (3, .19, -.13, 0, 16), (5, .23, -.12, .14, 22),
              (8, .24, -.14, 0, 19), (12, .24, -.14, 0, 19),
              (15, .16, -.11, .055, 11), (17, .16, -.07, 0, 9)],
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
    if role == "warrior":
        # Keep the spearhead leading the run, with a small rebound on each footfall.
        carries = [(.26, .38, .89), (.27, .29, .92), (.29, .37, .88),
                   (.30, .44, .85), (.29, .30, .91), (.26, .36, .89), (.26, .38, .89)]
        return [(frame, shift, dict(pose, aim=carry)) for (frame, shift, pose), carry in zip(poses, carries)]
    if role == "mage":
        return [(frame, shift, dict(pose, aim=(.49, .80, -.33))) for frame, shift, pose in poses]
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
        key(1, (0, -.146, -.068), hips=(18, 35, -8), head=(-13, -32, 4), right_arm=(-39, 23, 30),
            right_elbow=(-97, 0, 0), aim=(.18, .32, .93), left_arm=(-63, 9, -26), coat=(-36, -29, 11)),
        key(3, (.022, -.177, -.143), hips=(24, 28, -9), head=(-18, -27, 5), right_arm=(-51, 17, 23),
            right_elbow=(-83, 0, 0), aim=(.12, .15, .97), left_arm=(-57, -9, -29), coat=(-51, -28, 13)),
        key(6, (-.036, -.143, -.14), hips=(31, -15, -6), head=(-23, 15, 5), right_arm=(-102, 13, 19),
            right_elbow=(-8, 0, 0), aim=(.015, .05, 1), left_arm=(-38, 8, -42),
            coat=(-87, 34, 15), hair=(-47, 11, -9)),
        key(9, (-.028, -.151, -.11), hips=(30, -17, -8), head=(-23, 17, 4), right_arm=(-101, 14, 20),
            right_elbow=(-13, 0, 0), aim=(.02, .061, 1), left_arm=(-42, 2, -40), coat=(-66, 25, 10)),
        key(12, (0, -.106, -.02), hips=(19, 8, -6), right_arm=(-65, 24, 23), right_elbow=(-55, 0, 0),
            aim=(.23, .55, .82), coat=(-53, -15, -16)),
        key(17, (0, -.049, 0)),
    ],
    "skill2": [
        key(1, (0, -.13, .12), hips=(38, 13, 8), head=(-25, -12, -5), right_arm=(-111, -14, 15),
            left_arm=(-99, 14, -18), right_elbow=(-34, 0, 0), left_elbow=(-47, 0, 0),
            weapon=(33, -26, 85), left_leg=(-39, 0, -16), right_leg=(31, 0, 15),
            left_knee=(57, 0, 0), right_knee=(34, 0, 0), coat=(-66, 3, 13)),
        key(4, (0, .017, -.041), hips=(-9, 6, -5), head=(2, -6, 4), right_arm=(-138, 4, 32),
            right_elbow=(-36, 0, 0), aim=(.32, .93, -.32), left_arm=(-37, 15, -44), coat=(-55, 1, 10)),
        key(8, (0, -.225, .018), hips=(22, 3, -8), head=(-15, 2, 5), right_arm=(-45, 4, 24),
            right_elbow=(-37, 0, 0), aim=(.13, .99, .10), left_arm=(-73, 9, -41),
            left_elbow=(-53, 0, 0), coat=(-84, 14, 16), hair=(-41, -9, 12)),
        key(10, (.01, -.198, .025), hips=(24, -2, -8), head=(-17, 6, 5), right_arm=(-44, 8, 27),
            right_elbow=(-34, 0, 0), aim=(.11, .993, .08), left_arm=(-65, 8, -39), coat=(-69, 14, 11)),
        key(13, (0, -.076, .03), hips=(12, -12, 5), right_arm=(-44, 18, 20), right_elbow=(-48, 0, 0),
            aim=(.26, .86, .42), coat=(-48, -10, -8)),
        key(17, (0, -.049, 0)),
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
        key(3, (-.033, -.043, -.02), hips=(13, 26, 7), head=(-9, -23, -4), left_arm=(-63, 32, -24),
            left_elbow=(-82, 0, 0), right_arm=(-53, -8, 31), right_elbow=(-65, 0, 0),
            aim=(.34, .85, -.29), offhand=(-14, 9, -12), gesture="gather", coat=(-40, -24, 17)),
        key(6, (-.031, .041, .05), hips=(-3, -9, -9), left_arm=(-102, 12, -44), left_elbow=(-13, 0, 0),
            right_arm=(-76, -16, 61), right_elbow=(-18, 0, 0), aim=(.53, .31, .79),
            offhand=(12, -20, -6), gesture="ward", hair=(-37, 6, -14)),
        key(9, (-.024, .016, .032), hips=(7, -19, -9), left_arm=(-82, -18, -57), left_elbow=(-25, 0, 0),
            right_arm=(-54, 24, 54), right_elbow=(-27, 0, 0), aim=(.63, .55, .57),
            offhand=(13, -10, 3), gesture="flare", coat=(-61, 25, 16)),
        key(15),
    ],
    "sweep": [
        key(1, (0, -.041, -.05), hips=(12, 26, -8), head=(-8, -22, 4), left_arm=(-72, 27, -24),
            right_arm=(-74, 12, 30), right_elbow=(-63, 0, 0), left_elbow=(-63, 0, 0),
            aim=(.35, .75, -.48), gesture="gather", left_leg=(-22, 0, -9), right_leg=(19, 0, 13),
            left_knee=(38, 0, 0), right_knee=(22, 0, 0), coat=(-49, -15, -14)),
        key(3, (.018, -.089, -.08), hips=(20, 32, -10), head=(-15, -28, 6),
            left_arm=(-81, 38, -19), left_elbow=(-86, 0, 0), right_arm=(-85, -10, 35),
            right_elbow=(-74, 0, 0), aim=(.64, .55, -.55), gesture="gather",
            left_leg=(-34, 0, -12), right_leg=(14, 0, 13), left_knee=(53, 0, 0), right_knee=(37, 0, 0),
            coat=(-53, -25, -16)),
        key(6, (-.024, -.042, .089), hips=(25, -18, 7), head=(-19, 18, -5),
            left_arm=(-63, -22, -51), left_elbow=(-30, 0, 0), right_arm=(-91, 9, 27),
            right_elbow=(-13, 0, 0), aim=(.09, .13, 1), offhand=(16, -7, 9), gesture="flare",
            left_leg=(-38, 0, -14), right_leg=(24, 0, 11), left_knee=(48, 0, 0), right_knee=(23, 0, 0),
            coat=(-83, 30, 28), hair=(-39, -13, 10)),
        key(9, (-.031, -.066, .051), hips=(16, -24, 9), head=(-13, 21, -3),
            left_arm=(-44, -26, -57), left_elbow=(-32, 0, 0), right_arm=(-68, 16, 37),
            right_elbow=(-32, 0, 0), aim=(.30, .56, .79), gesture="ward",
            left_leg=(-34, 0, -13), right_leg=(21, 0, 10), left_knee=(45, 0, 0), right_knee=(26, 0, 0),
            coat=(-64, 22, 18)),
        key(19, (0, -.038, 0)),
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
        key(4, (0, .13, -.016), hips=(-13, -14, -8), head=(-6, 20, 3), right_arm=(-157, -14, 30),
            right_elbow=(-33, 0, 0), left_arm=(-96, -6, -35), left_elbow=(-63, 0, 0),
            aim=(.10, .89, -.44), offhand=(-15, 9, 11), gesture="gather", coat=(-68, 13, -16)),
        key(8, (0, .075, .026), hips=(11, 6, 8), head=(-23, -4, -6), right_arm=(-144, -9, 39),
            right_elbow=(-18, 0, 0), left_arm=(-26, 4, -46), left_elbow=(-19, 0, 0),
            aim=(.18, .95, .1), offhand=(4, 7, 13), gesture="ward", coat=(-76, -7, 19)),
        key(11, (0, .009, .04), hips=(19, 3, 5), head=(-11, -3, -2), right_arm=(-91, -7, 35),
            right_elbow=(-23, 0, 0), left_arm=(-18, 7, -40), left_elbow=(-27, 0, 0),
            aim=(.28, .60, .74), gesture="flare", coat=(-58, -10, 14)),
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
            coat=(-45, -33, -19)),
        key(2, (.016, -.125, -.08), hips=(26, 29, 8), head=(-21, -30, -4), right_arm=(-43, 21, 24),
            right_elbow=(-103, 0, 0), left_arm=(-60, -19, -25), left_elbow=(-97, 0, 0),
            aim=(.28, .52, .8), offhand_aim=(-.32, .54, .72), coat=(-44, -35, -15)),
        key(4, (.012, -.102, .074), hips=(32, -3, -5), right_arm=(-93, 8, 19), right_elbow=(-12, 0, 0),
            left_arm=(-97, -11, -22), left_elbow=(-16, 0, 0), aim=(.10, .05, 1), offhand_aim=(-.10, .04, 1),
            head=(-24, 3, 4), coat=(-69, 23, -16), hair=(-48, -11, 8)),
        key(7, (.012, -.113, .039), hips=(24, -18, -6), right_arm=(-67, 14, 37),
            right_elbow=(-34, 0, 0), left_arm=(-75, -6, -41), left_elbow=(-29, 0, 0), coat=(-54, 22, -12)),
        key(12, (0, -.078, 0)),
    ],
    "reverse": [
        key(1, (-.041, -.074, -.04), hips=(19, 45, 14), head=(-13, -39, -8), left_arm=(-36, 33, -29),
            left_elbow=(-87, 0, 0), right_arm=(-44, -25, 25), right_elbow=(-82, 0, 0),
            coat=(-55, -36, 16)),
        key(3, (-.035, -.13, -.015), hips=(29, 38, 11), head=(-19, -34, -8), left_arm=(-55, 37, -23),
            left_elbow=(-104, 0, 0), right_arm=(-62, -39, 32), right_elbow=(-96, 0, 0),
            aim=(.41, .45, .78), offhand_aim=(-.53, .30, .62), coat=(-47, -37, 12)),
        key(5, (-.071, -.106, .066), hips=(20, -11, -10), left_arm=(-86, -28, -67), left_elbow=(-15, 0, 0),
            right_arm=(-104, 19, 60), right_elbow=(-10, 0, 0), aim=(.39, .04, 1), offhand_aim=(-.44, .02, 1),
            head=(-15, 11, 8), coat=(-79, -33, 24), hair=(-33, 12, -13)),
        key(8, (-.057, -.117, .026), hips=(29, -31, -11), head=(-21, 27, 6), left_arm=(-71, -25, -66),
            left_elbow=(-25, 0, 0), right_arm=(-83, 25, 54), right_elbow=(-38, 0, 0), coat=(-71, 27, 18)),
        key(12, (0, -.078, 0)),
    ],
    "sweep": [
        key(1, (0, -.092, -.07), hips=(23, 36, -10), head=(-16, -30, 3), left_arm=(-56, 14, -35),
            right_arm=(-28, 40, 41), right_elbow=(-94, 0, 0), left_elbow=(-65, 0, 0),
            left_leg=(-28, 0, -9), right_leg=(24, 0, 14), left_knee=(49, 0, 0), coat=(-56, -27, -19)),
        key(3, (.012, -.176, -.08), hips=(33, 19, -14), head=(-24, -20, 8), left_arm=(-78, 27, -29),
            right_arm=(-43, 46, 33), right_elbow=(-109, 0, 0), left_elbow=(-81, 0, 0),
            left_leg=(-46, 0, -11), right_leg=(-15, 0, 13), left_knee=(68, 0, 0),
            right_knee=(53, 0, 0), coat=(-54, -32, -18)),
        key(5, (.021, .12, -.06), hips=(-14, -27, -21), head=(10, 24, 9), left_arm=(-70, -18, -55),
            right_arm=(-96, 11, 38), right_elbow=(-10, 0, 0), left_elbow=(-22, 0, 0),
            aim=(.09, .10, 1), offhand_aim=(-.72, .14, .68), left_leg=(-43, 0, -11),
            right_leg=(26, 0, 15), right_knee=(51, 0, 0), coat=(-81, 36, -26)),
        key(9, (.025, .32, -.11), hips=(14, -146, 29), head=(-8, 16, -11), left_arm=(-61, -8, -51),
            right_arm=(-58, 12, 51), left_elbow=(-69, 0, 0), right_elbow=(-79, 0, 0),
            left_leg=(-74, 0, -14), right_leg=(-55, 0, 12), left_knee=(96, 0, 0),
            right_knee=(99, 0, 0), coat=(-103, -30, 18)),
        key(13, (0, .18, -.07), hips=(8, -263, -23), head=(-5, -21, 11), left_arm=(-68, -7, -51),
            right_arm=(-50, 30, 45), right_elbow=(-32, 0, 0), left_leg=(-55, 0, -17),
            right_leg=(-9, 0, 19), left_knee=(73, 0, 0), right_knee=(33, 0, 0), coat=(-90, -26, -16)),
        key(17, (0, -.15, -.035), hips=(31, -326, -8), head=(-22, -17, 7), left_leg=(-39, 0, -13),
            left_knee=(62, 0, 0), right_leg=(2, 0, 14), right_knee=(24, 0, 0),
            right_arm=(-32, 19, 31), left_arm=(-57, -16, -39), coat=(-67, -14, -11)),
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
        key(1, (.044, -.113, -.04), hips=(23, 35, 11), head=(-10, -29, -7), right_arm=(-65, -15, 26),
            right_elbow=(-58, 0, 0), left_arm=(-26, 36, -33), left_elbow=(-83, 0, 0), coat=(-51, -24, -16)),
        key(4, (.018, -.151, -.055), hips=(30, 41, 13), head=(-12, -34, -9), left_arm=(-49, 43, -22),
            left_elbow=(-112, 0, 0), offhand_aim=(-.31, .36, .68),
            right_arm=(-49, -26, 38), right_elbow=(-71, 0, 0), coat=(-63, -30, -20)),
        key(7, (-.073, -.193, .078), hips=(39, -9, -13), head=(-19, 9, 10), left_arm=(-77, -8, -27),
            left_elbow=(-10, 0, 0), offhand_aim=(-.12, -.47, .87),
            right_arm=(19, 24, 45), right_elbow=(-29, 0, 0), aim=(.44, .14, -.73), coat=(-97, 33, 25)),
        key(10, (-.064, -.176, .082), hips=(37, -16, -12), head=(-18, 13, 8), left_arm=(-61, -11, -35),
            left_elbow=(-22, 0, 0), offhand_aim=(-.28, -.37, .88),
            right_arm=(7, 18, 44), right_elbow=(-39, 0, 0), coat=(-80, 25, 20)),
        key(14, (-.024, -.102, .01), hips=(23, 5, -7), right_arm=(-28, 24, 27), right_elbow=(-53, 0, 0)),
        key(19, (0, -.078, 0)),
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
